import { test } from "node:test";
import assert from "node:assert/strict";
import { safeErrorCategory } from "../lib/server-diagnostics.mjs";

test("classifies actionable database failures without returning driver details", () => {
  for (const [code, category] of [
    ["28P01", "DATABASE_AUTHENTICATION_FAILED"],
    ["42P01", "DATABASE_TABLE_MISSING"],
    ["ENETUNREACH", "DATABASE_NETWORK_UNREACHABLE"],
    ["SELF_SIGNED_CERT_IN_CHAIN", "DATABASE_TLS_CERTIFICATE_FAILED"],
  ]) assert.equal(safeErrorCategory({ code, message: "private details" }), category);
  assert.equal(safeErrorCategory(new Error("Database is not configured.")), "DATABASE_URL_MISSING");
  assert.equal(safeErrorCategory(new AggregateError([{ code: "ECONNREFUSED" }])), "DATABASE_CONNECTION_REFUSED");
  assert.equal(safeErrorCategory(new Error("wrapper", { cause: { code: "ETIMEDOUT" } })), "DATABASE_CONNECTION_TIMEOUT");
});

test("does not expose secrets through unknown errors or recursive causes", () => {
  const secret = "postgresql://private-user:private-password@private-host/database";
  assert.equal(safeErrorCategory({ code: secret, message: secret }), "UNEXPECTED_SERVER_ERROR");
  const cyclic = { message: secret }; cyclic.cause = cyclic;
  assert.equal(safeErrorCategory(cyclic), "UNEXPECTED_SERVER_ERROR");
  for (const value of [null, undefined, secret, 1, {}])
    assert.equal(safeErrorCategory(value), "UNEXPECTED_SERVER_ERROR");
});
