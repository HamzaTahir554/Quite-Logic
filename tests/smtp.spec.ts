import { test, expect } from "@playwright/test";
import { smtpOptions, smtpRetryIsSafe } from "../lib/email/smtp-config.mjs";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";

test("SMTP requires verified TLS, uses the Resend key privately, and distinguishes ambiguous delivery", () => {
  const options = smtpOptions({ RESEND_API_KEY: "fixture-private-key" });
  expect(options).toMatchObject({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: { user: "resend", pass: "fixture-private-key" },
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
    logger: false,
    debug: false,
  });
  expect(
    smtpOptions({ RESEND_API_KEY: "fixture", SMTP_PORT: "587" }),
  ).toMatchObject({ secure: false, requireTLS: true });
  expect(() =>
    smtpOptions({
      RESEND_API_KEY: "fixture",
      SMTP_HOST: "other.example",
      SMTP_USER: "client",
    }),
  ).toThrow("SMTP authentication is not configured.");
  expect(() =>
    smtpOptions({ RESEND_API_KEY: "fixture", SMTP_SECURE: "false" }),
  ).toThrow();
  expect(smtpRetryIsSafe({ code: "EAUTH", responseCode: 535 })).toBe(true);
  expect(smtpRetryIsSafe({ code: "ESOCKET", command: "DATA" })).toBe(false);
  expect(smtpRetryIsSafe({ code: "ETIMEDOUT", command: "CONN" })).toBe(true);
  expect(smtpRetryIsSafe({ responseCode: 550, command: "DATA" })).toBe(true);
});

test("SMTP contact and admin uncertain sends remain recorded and are not automatically resent", async ({
  request,
}) => {
  test.skip(
    process.env.E2E_MAIL_CAPTURE !== "1",
    "Uses the isolated SMTP fixture, never live mail.",
  );
  const headers = {
    Origin: "http://localhost:3100",
    "Idempotency-Key": randomUUID(),
  };
  const email = `smtp-${randomUUID()}@example.test`;
  const input = {
    name: "SMTP test",
    email,
    message: "[UNCERTAIN] A test message whose SMTP acknowledgement is lost.",
  };
  expect(
    (await request.post("/api/contact", { headers, data: input })).status(),
  ).toBe(500);
  expect(
    (await request.post("/api/contact", { headers, data: input })).status(),
  ).toBe(409);
  const pool = new Pool({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5434/postgres",
    max: 1,
  });
  try {
    expect(
      (
        await pool.query(
          "SELECT delivery_status FROM messages WHERE from_email=$1",
          [email],
        )
      ).rows[0].delivery_status,
    ).toBe("Delivery uncertain");
    expect(
      (
        await request.post("/api/admin/login", {
          headers,
          data: {
            email: "admin@example.test",
            password: "Local-Test-Only-123456!",
          },
        })
      ).status(),
    ).toBe(200);
    const key = randomUUID();
    const message = {
      to: email,
      subject: "SMTP uncertainty test",
      body: "[UNCERTAIN] An admin message with a lost SMTP acknowledgement.",
    };
    for (const status of [502, 409])
      expect(
        (
          await request.post("/api/admin/emails", {
            headers: { ...headers, "Idempotency-Key": key },
            data: message,
          })
        ).status(),
      ).toBe(status);
    expect(
      (
        await pool.query(
          "SELECT status FROM email_history WHERE recipient=$1",
          [email],
        )
      ).rows[0].status,
    ).toBe("Delivery uncertain");
    const mails = (await readFile("qa/.test-mailbox.jsonl", "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    expect(mails.filter((entry) => entry.replyTo === email)).toHaveLength(1);
    expect(mails.filter((entry) => entry.to === email)).toHaveLength(1);
  } finally {
    await pool.end();
  }
});
