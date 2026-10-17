import "server-only";
import { Pool } from "pg";
import { postgresConfig } from "./postgres-config.mjs";

const globalDb = globalThis as unknown as { quiteDb?: Pool };
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  if (!globalDb.quiteDb) {
    globalDb.quiteDb = new Pool({
      ...postgresConfig(process.env.DATABASE_URL),
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
    globalDb.quiteDb.on("error", () =>
      console.error("Database connection interrupted."),
    );
  }
  return globalDb.quiteDb;
}
