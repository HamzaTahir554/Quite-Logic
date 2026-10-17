// Copies only this application's tables into a fresh Supabase database.
// Values, connection strings, password hashes and session tokens never leave memory/logs.
import { Pool } from "pg";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { postgresConfig } from "../lib/postgres-config.mjs";

try {
  process.loadEnvFile(".env.local");
} catch {}
const tables = [
  "admins",
  "clients",
  "reviews",
  "messages",
  "email_history",
  "admin_sessions",
  "password_resets",
  "request_limits",
  "portfolio_projects",
  "app_migrations",
];
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const hashRows = (rows) =>
  createHash("sha256")
    .update(
      rows
        .map((row) => JSON.stringify(canonical(row.data)))
        .sort()
        .join("\n"),
    )
    .digest("hex");
class MigrationError extends Error {}
const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.env.SUPABASE_DATABASE_URL;
if (!sourceUrl || !targetUrl)
  throw new MigrationError(
    "Both database settings must be configured privately.",
  );
let targetHost;
let sourceIdentity;
let targetIdentity;
try {
  const targetUrlParts = new URL(targetUrl);
  const sourceUrlParts = new URL(sourceUrl);
  targetHost = targetUrlParts.hostname;
  sourceIdentity = sourceUrlParts.hostname + sourceUrlParts.username;
  targetIdentity = targetUrlParts.hostname + targetUrlParts.username;
} catch {
  console.error(
    "A private database URL is invalid. Migration was not started.",
  );
  process.exit(1);
}
if (
  !targetHost.endsWith(".supabase.co") &&
  !targetHost.endsWith(".supabase.com")
)
  throw new MigrationError("Target must be the configured Supabase database.");
if (sourceIdentity === targetIdentity)
  throw new MigrationError("Source and target must be different databases.");
const sourcePool = new Pool({
  ...postgresConfig(sourceUrl),
  max: 1,
  connectionTimeoutMillis: 10000,
});
const targetPool = new Pool({
  ...postgresConfig(targetUrl),
  max: 1,
  connectionTimeoutMillis: 10000,
});
let source, target;
try {
  source = await sourcePool.connect();
  target = await targetPool.connect();
  await source.query("BEGIN");
  // Blocks writes during the snapshot/copy without changing source data.
  await source.query("SET LOCAL lock_timeout='5s'");
  await source.query("SET LOCAL TIME ZONE 'UTC'");
  await source.query(
    "LOCK TABLE " +
      tables.map((table) => "public." + quote(table)).join(",") +
      " IN SHARE MODE",
  );
  await target.query("BEGIN");
  await target.query("SET LOCAL TIME ZONE 'UTC'");
  await target.query("SELECT pg_advisory_xact_lock(817326410)");
  const existing = await target.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'",
  );
  if (existing.rows.length)
    throw new MigrationError(
      "Target contains existing tables. Migration stopped without replacing them.",
    );
  const snapshots = new Map();
  for (const table of tables) {
    const result = await source.query(
      "SELECT to_jsonb(t) AS data FROM public." + quote(table) + " t",
    );
    snapshots.set(table, result.rows);
  }
  console.log(
    JSON.stringify({
      sourceSnapshot: tables.map((table) => ({
        table,
        rows: snapshots.get(table).length,
      })),
      targetEmpty: true,
    }),
  );
  if (!process.argv.includes("--apply")) {
    console.log(
      "Read-only preflight passed. Use --apply to copy into the empty target.",
    );
  } else {
    const directory = new URL("../database/", import.meta.url);
    for (const file of (await readdir(directory))
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort()) {
      const sql = (await readFile(new URL(file, directory), "utf8")).replace(
        /^\s*(?:BEGIN|COMMIT);\s*$/gm,
        "",
      );
      await target.query(sql);
    }
    // These are the fresh schema's own concept/ledger seeds, not existing user data.
    await target.query("DELETE FROM public.portfolio_projects");
    await target.query("DELETE FROM public.app_migrations");
    const roles = await target.query(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')",
    );
    for (const table of tables) {
      await target.query(
        "ALTER TABLE public." + quote(table) + " ENABLE ROW LEVEL SECURITY",
      );
      await target.query(
        "REVOKE ALL ON TABLE public." + quote(table) + " FROM PUBLIC",
      );
      for (const role of roles.rows)
        await target.query(
          "REVOKE ALL ON TABLE public." +
            quote(table) +
            " FROM " +
            quote(role.rolname),
        );
      const metadata = await target.query(
        "SELECT column_name,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
        [table],
      );
      const columns = metadata.rows;
      for (const row of snapshots.get(table)) {
        const values = columns.map((column) => {
          const value = row.data[column.column_name];
          return value != null && ["json", "jsonb"].includes(column.udt_name)
            ? JSON.stringify(value)
            : value;
        });
        await target.query(
          "INSERT INTO public." +
            quote(table) +
            "(" +
            columns.map((column) => quote(column.column_name)).join(",") +
            ") VALUES(" +
            columns.map((_, index) => "$" + (index + 1)).join(",") +
            ")",
          values,
        );
      }
      const copied = await target.query(
        "SELECT to_jsonb(t) AS data FROM public." + quote(table) + " t",
      );
      if (hashRows(copied.rows) !== hashRows(snapshots.get(table)))
        throw new MigrationError(
          "Copied data verification failed; target changes rolled back.",
        );
    }
    const permissions = await target.query(
      "SELECT t.tablename FROM pg_tables t WHERE t.schemaname='public' AND (NOT t.rowsecurity OR has_table_privilege('anon','public.'||quote_ident(t.tablename),'SELECT') OR has_table_privilege('authenticated','public.'||quote_ident(t.tablename),'SELECT'))",
    );
    if (permissions.rows.length)
      throw new MigrationError(
        "Private database API access check failed; target changes rolled back.",
      );
    await target.query("COMMIT");
    console.log(
      JSON.stringify({
        copied: true,
        allTableHashesMatch: true,
        rlsEnabled: true,
        browserRoleAccess: false,
        sourcePreserved: true,
      }),
    );
  }
} catch (error) {
  console.error(
    error instanceof MigrationError
      ? error.message
      : JSON.stringify({
          migrationFailed: true,
          code: error.code || "connection_or_copy_error",
        }),
  );
  process.exitCode = 1;
} finally {
  if (target) {
    try {
      await target.query("ROLLBACK");
    } catch {}
    target.release();
  }
  if (source) {
    try {
      await source.query("ROLLBACK");
    } catch {}
    source.release();
  }
  await Promise.all([sourcePool.end(), targetPool.end()]);
}
