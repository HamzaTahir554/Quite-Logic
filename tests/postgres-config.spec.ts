import { test, expect } from "@playwright/test";
import { postgresConfig } from "../lib/postgres-config.mjs";

test("PostgreSQL verifies remote TLS and scopes the Supabase CA to genuine Supabase hosts", () => {
  const target = postgresConfig(
    "postgresql://postgres:fixture@aws-0-example.pooler.supabase.com:5432/postgres?sslmode=no-verify",
  );
  expect(new URL(target.connectionString).searchParams.has("sslmode")).toBe(
    false,
  );
  expect(target.ssl).toMatchObject({ rejectUnauthorized: true });
  if (typeof target.ssl !== "object")
    throw new Error("Remote TLS must be configured.");
  expect(
    target.ssl.ca?.some((certificate) =>
      certificate.includes("BEGIN CERTIFICATE"),
    ),
  ).toBe(true);
  for (const host of ["example.neon.tech", "pooler.supabase.com.evil.test"])
    expect(
      postgresConfig(`postgresql://postgres:fixture@${host}/postgres`).ssl,
    ).toEqual({ rejectUnauthorized: true });
  expect(
    postgresConfig("postgresql://postgres:fixture@127.0.0.1:5434/postgres").ssl,
  ).toBe(false);
  expect(() => postgresConfig("invalid-private-setting")).toThrow(
    "Database connection string is invalid.",
  );
});
