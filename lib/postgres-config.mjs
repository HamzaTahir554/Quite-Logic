import { rootCertificates } from "node:tls";
import { supabaseCa } from "./supabase-ca.mjs";

/** @param {string} connectionString */
export function postgresConfig(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("Database connection string is invalid.");
  }
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    url.hostname,
  );
  const supabase =
    url.hostname.endsWith(".supabase.co") ||
    url.hostname.endsWith(".supabase.com");
  // URL SSL flags must not override verified TLS with pg's compatibility modes.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          ...(supabase ? { ca: [...rootCertificates, supabaseCa] } : {}),
        },
  };
}
