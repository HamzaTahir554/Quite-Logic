import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
try {
  process.loadEnvFile(".env.local");
} catch {}
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local or server settings.");
const url = new URL(process.env.DATABASE_URL);
const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
  url.searchParams.delete(key);
const pool = new Pool({
  connectionString: url.toString(),
  ssl: local ? false : { rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
});
try {
  if (process.argv.includes("--admin")) {
    const email = process.env.ADMIN_SETUP_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_SETUP_PASSWORD;
    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      password.length < 16 ||
      password.length > 200
    )
      throw new Error(
        "Set ADMIN_SETUP_EMAIL and ADMIN_SETUP_PASSWORD (16–200 characters) in your private environment.",
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
    await pool.query(
      await readFile(
        new URL("../database/001-reviews.sql", import.meta.url),
        "utf8",
      ),
    );
    console.log("Database migration complete.");
  }
} catch {
  console.error(
    "Database setup failed. Check connectivity, migration, and private setup settings.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
