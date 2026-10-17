// Isolated, disposable PostgreSQL-compatible fixture. Never used by the deployed app.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFile, readdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
const db = await PGlite.create();
const capture = process.env.E2E_MAIL_CAPTURE === "1";
const mailbox = resolve("qa/.test-mailbox.jsonl");
if (capture) await writeFile(mailbox, "");
const directory = new URL("../database/", import.meta.url);
for (const file of (await readdir(directory))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort())
  await db.exec(await readFile(new URL(file, directory), "utf8"));
const salt = randomBytes(16).toString("hex");
await db.query("INSERT INTO admins(id,email,password_hash) VALUES($1,$2,$3)", [
  randomUUID(),
  "admin@example.test",
  `${salt}:${scryptSync("Local-Test-Only-123456!", salt, 64).toString("hex")}`,
]);
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 5434,
  maxConnections: 10,
});
await server.start();
const app = spawn(
  process.execPath,
  [
    ...(capture
      ? ["--import", new URL("./test-mail-hook.mjs", import.meta.url).href]
      : []),
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5434/postgres",
      GMAIL_APP_PASSWORD: capture ? "isolated-test-credential" : "",
      QUIET_TEST_MAILBOX: capture ? mailbox : "",
      RESEND_API_KEY: "",
      CONTACT_FROM_EMAIL: "",
    },
  },
);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  app.kill();
  await server.stop();
  await db.close();
  if (capture) await rm(mailbox, { force: true });
}
process.on("SIGINT", async () => {
  await close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await close();
  process.exit(0);
});
app.on("exit", async (code) => {
  await close();
  process.exit(code || 0);
});
