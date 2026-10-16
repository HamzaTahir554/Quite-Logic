import "server-only";
import { Pool } from "pg";

const globalDb = globalThis as unknown as { quiteDb?: Pool };
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  if (!globalDb.quiteDb) {
    const url = new URL(process.env.DATABASE_URL);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
      url.searchParams.delete(key);
    globalDb.quiteDb = new Pool({
      connectionString: url.toString(),
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      ssl: local ? false : { rejectUnauthorized: true },
    });
    globalDb.quiteDb.on("error", () =>
      console.error("Database connection interrupted."),
    );
  }
  return globalDb.quiteDb;
}
