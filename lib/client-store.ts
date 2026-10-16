import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
export async function saveClient(
  connection: PoolClient,
  input: { email: string; name: string; company: string },
) {
  const result = await connection.query(
    "INSERT INTO clients(id,email,name,company) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET name=excluded.name,company=excluded.company RETURNING id",
    [randomUUID(), input.email.toLowerCase(), input.name, input.company],
  );
  return result.rows[0].id as string;
}
