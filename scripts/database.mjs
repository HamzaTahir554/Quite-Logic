import { Pool } from "pg";
import { readFile, readdir } from "node:fs/promises";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { postgresConfig } from "../lib/postgres-config.mjs";
class SetupInputError extends Error {}
try {
  process.loadEnvFile(".env.local");
} catch {}
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local or server settings.");
const pool = new Pool({
  ...postgresConfig(process.env.DATABASE_URL),
  connectionTimeoutMillis: 10000,
});
try {
  if (process.argv.includes("--admin")) {
    const email = process.env.ADMIN_SETUP_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_SETUP_PASSWORD;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new SetupInputError(
        "Set ADMIN_SETUP_EMAIL to a valid email address in .env.local or your private environment.",
      );
    if (!password)
      throw new SetupInputError(
        "Set ADMIN_SETUP_PASSWORD in .env.local or your private environment.",
      );
    if (password.length < 16 || password.length > 200)
      throw new SetupInputError(
        "ADMIN_SETUP_PASSWORD must contain 16–200 characters. Update it in .env.local or your private environment, then run npm run admin:setup again.",
      );
    const salt = randomBytes(16).toString("hex");
    const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const result = await connection.query(
        "INSERT INTO admins(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash RETURNING id",
        [randomUUID(), email, hash],
      );
      await connection.query("DELETE FROM admin_sessions WHERE admin_id=$1", [
        result.rows[0].id,
      ]);
      await connection.query("COMMIT");
      console.log(
        "Admin configured. Existing sessions revoked. Remove ADMIN_SETUP_PASSWORD from the environment.",
      );
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  } else {
    const directory = new URL("../database/", import.meta.url);
    for (const file of (await readdir(directory))
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort())
      await pool.query(await readFile(new URL(file, directory), "utf8"));
    console.log("Database migration complete.");
  }
} catch (error) {
  console.error(
    error instanceof SetupInputError
      ? error.message
      : "Database setup failed. Check connectivity, migration, and private setup settings.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
