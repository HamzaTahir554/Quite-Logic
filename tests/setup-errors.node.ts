import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { connectDB } from "../lib/mongodb";
import { SetupError, setupErrorMessage } from "../lib/setup-errors";
import { passwordSchema } from "../lib/admin-validation";

test("missing and placeholder MongoDB settings fail before attempting a connection", async () => {
  const original = process.env.MONGODB_URI;
  try {
    for (const value of [
      "",
      "   ",
      "mongodb+srv://<username>:<password>@cluster.example/db",
      "postgres://example/db",
    ]) {
      process.env.MONGODB_URI = value;
      await assert.rejects(connectDB(), SetupError);
    }
  } finally {
    if (original === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = original;
  }
});

test("setup diagnostics identify common failures without echoing driver secrets", () => {
  const secret = "DO_NOT_PRINT_THIS_TEST_MARKER";
  for (const [fields, expected] of [
    [{ code: 18 }, "authentication failed"],
    [{ code: 13 }, "lacks permission"],
    [{ code: 11000 }, "already exists"],
    [{ name: "MongoParseError" }, "is invalid"],
    [{ name: "MongooseServerSelectionError" }, "Cannot reach"],
    [{ name: "MongoNetworkError" }, "Cannot reach"],
  ] as const) {
    const message = setupErrorMessage({ ...fields, message: secret });
    assert.ok(message.includes(expected));
    assert.ok(!message.includes(secret));
  }
  assert.ok(!setupErrorMessage(new Error(secret)).includes(secret));
  assert.equal(
    setupErrorMessage(new SetupError("Account already exists.")),
    "Account already exists.",
  );
  const invalidPassword = passwordSchema.safeParse("short");
  assert.ok(!invalidPassword.success);
  assert.match(setupErrorMessage(invalidPassword.error), /at least 12/);
});

for (const script of ["setup-admin.ts", "check-db.ts"]) {
  test(`${script} reports the missing URI without asking for a password`, () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", `scripts/${script}`],
      {
        cwd: process.cwd(),
        env: { ...process.env, MONGODB_URI: "" },
        encoding: "utf8",
        input: "",
        timeout: 15000,
        windowsHide: true,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    const output = result.stdout + result.stderr;
    assert.match(output, /MONGODB_URI is missing/);
    assert.ok(!output.includes("Admin email:"));
    assert.ok(!output.includes("New password"));
  });
}
