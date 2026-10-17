import { test, expect } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { Pool } from "pg";
const origin = "http://localhost:3100";
const headers = { Origin: origin };
const db = () =>
  new Pool({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5434/postgres",
    max: 1,
  });
async function sql(text: string, values: unknown[] = []) {
  const pool = db();
  try {
    return await pool.query(text, values);
  } finally {
    await pool.end();
  }
}
async function mail() {
  try {
    return (await readFile("qa/.test-mailbox.jsonl", "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
async function inbound(id: string, value: Record<string, unknown>) {
  let emails: Record<string, unknown> = {};
  try {
    emails = JSON.parse(await readFile("qa/.test-inbound.json", "utf8"));
  } catch {}
  emails[id] = value;
  await writeFile("qa/.test-inbound.json", JSON.stringify(emails));
}
function signed(
  payload: string,
  id = "msg_" + randomUUID(),
  timestamp = Math.floor(Date.now() / 1000),
) {
  const signature = createHmac(
    "sha256",
    Buffer.from("isolated-webhook-test-secret-12345"),
  )
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return {
    "Content-Type": "application/json",
    "svix-id": id,
    "svix-timestamp": String(timestamp),
    "svix-signature": `v1,${signature}`,
  };
}
test.describe("Resend provider and Inbox integration", () => {
  test.skip(
    process.env.E2E_MAIL_CAPTURE !== "1",
    "Uses the isolated Resend HTTP fixture, never live email.",
  );
  test("contact validates, uses verified From and customer Reply-To, escapes HTML, deduplicates and reports provider failure", async ({
    request,
  }) => {
    const email = `visitor-${randomUUID()}@example.test`;
    const input = {
      name: "Client <img src=x>",
      email: ` ${email} `,
      message: "A meaningful inquiry with <script>alert(1)</script> text.",
      subject: "Website development",
    };
    const key = randomUUID();
    const response = await request.post("/api/contact", {
      headers: { ...headers, "Idempotency-Key": key },
      data: input,
    });
    expect(response.status(), await response.text()).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Message sent successfully.",
    });
    const captured = (await mail()).find((entry) => entry.replyTo === email);
    expect(captured.from).toBe("Quiet Logic <contact@quitelogic.com>");
    expect(captured.to).toBe("contact@quitelogic.com");
    expect(captured.subject).toBe(input.subject);
    expect(captured.html).not.toContain("<script>");
    expect(captured.html).toContain("&lt;img src=x&gt;");
    expect(captured.text).toContain("Submitted:");
    const repeat = await request.post("/api/contact", {
      headers: { ...headers, "Idempotency-Key": key },
      data: input,
    });
    expect(repeat.status()).toBe(200);
    expect(
      (await mail()).filter((entry) => entry.replyTo === email),
    ).toHaveLength(1);
    expect(
      (await sql("SELECT id FROM messages WHERE from_email=$1", [email])).rows,
    ).toHaveLength(1);
    const changed = await request.post("/api/contact", {
      headers: { ...headers, "Idempotency-Key": key },
      data: { ...input, message: input.message + " updated" },
    });
    expect(changed.status()).toBe(409);
    const failedEmail = `failure-${randomUUID()}@example.test`;
    const failed = await request.post("/api/contact", {
      headers,
      data: {
        ...input,
        email: failedEmail,
        message: input.message + " [FAIL]",
      },
    });
    expect(failed.status()).toBe(500);
    expect(await failed.json()).toEqual({
      success: false,
      message: "Unable to send message.",
    });
    expect(
      (
        await sql("SELECT delivery_status FROM messages WHERE from_email=$1", [
          failedEmail,
        ])
      ).rows[0].delivery_status,
    ).toBe("Notification failed");
    const minimal = await request.post("/api/contact", {
      headers: { Origin: "http://127.0.0.1:3100" },
      data: {
        name: "Minimal Client",
        email: `minimal-${randomUUID()}@example.test`,
        message: input.message,
      },
    });
    expect(minimal.status()).toBe(200);
    for (const invalid of [
      { email },
      { ...input, name: " " },
      { ...input, email: "no" },
      { ...input, message: " " },
      { ...input, message: "x".repeat(5001) },
      { ...input, website: "spam" },
      { ...input, subject: "Bad\r\nBcc: x@test.com" },
      { ...input, extra: {} },
    ]) {
      const result = await request.post("/api/contact", {
        headers,
        data: invalid,
      });
      expect(result.status()).toBe(400);
      expect((await result.json()).success).toBe(false);
    }
    expect(
      (
        await request.post("/api/contact", {
          headers: { ...headers, "Content-Type": "application/json" },
          data: "{broken",
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/contact", {
          headers: { Origin: "https://evil.test" },
          data: input,
        })
      ).status(),
    ).toBe(403);
    expect((await request.get("/api/contact")).status()).toBe(405);
    const rateEmail = `limit-${randomUUID()}@example.test`;
    for (let i = 0; i < 6; i++) {
      const result = await request.post("/api/contact", {
        headers,
        data: { ...input, email: rateEmail },
      });
      expect(result.status()).toBe(i < 5 ? 200 : 429);
    }
    // The form notification received by Resend must not duplicate the Inbox row.
    const noticeId = randomUUID();
    await inbound(noticeId, { from: captured.from, headers: captured.headers });
    const payload = JSON.stringify({
      type: "email.received",
      data: { email_id: noticeId },
    });
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(payload),
          data: payload,
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await sql("SELECT id FROM messages WHERE provider_message_id=$1", [
          noticeId,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  test("webhook verifies raw signatures and timestamp, fetches bodies, is idempotent, and retries failures", async ({
    request,
  }) => {
    const id = randomUUID();
    await inbound(id, {
      text: null,
      html: '<h1>Useful inbound text</h1><script>alert("bad")</script><img src=x onerror="bad()">',
      from: "Direct Client <direct@example.test>",
    });
    const payload = JSON.stringify({
      type: "email.received",
      data: { email_id: id },
    });
    expect(
      (await request.post("/api/webhooks/resend", { data: payload })).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: { ...signed(payload), "svix-signature": "v1,bad" },
          data: payload,
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(
            payload,
            undefined,
            Math.floor(Date.now() / 1000) - 1000,
          ),
          data: payload,
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed("{bad"),
          data: "{bad",
        })
      ).status(),
    ).toBe(400);
    const unsupported = JSON.stringify({ type: "email.sent", data: {} });
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(unsupported),
          data: unsupported,
        })
      ).status(),
    ).toBe(200);
    const signature = signed(payload);
    for (const h of [signature, signature, signed(payload)])
      expect(
        (
          await request.post("/api/webhooks/resend", {
            headers: h,
            data: payload,
          })
        ).status(),
      ).toBe(200);
    const stored = await sql(
      "SELECT * FROM messages WHERE provider_message_id=$1",
      [id],
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0].body.toLowerCase()).toContain("useful inbound text");
    expect(stored.rows[0].body).not.toContain("alert(");
    expect(stored.rows[0].source).toBe("inbound_email");
    const second = randomUUID();
    await inbound(second, { message_id: stored.rows[0].rfc_message_id });
    const duplicate = JSON.stringify({
      type: "email.received",
      data: { email_id: second },
    });
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(duplicate),
          data: duplicate,
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await sql("SELECT id FROM messages WHERE rfc_message_id=$1", [
          stored.rows[0].rfc_message_id,
        ])
      ).rows,
    ).toHaveLength(1);
    const unavailable = randomUUID();
    const retry = JSON.stringify({
      type: "email.received",
      data: { email_id: unavailable },
    });
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(retry),
          data: retry,
        })
      ).status(),
    ).toBe(500);
    await inbound(unavailable, {});
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(retry),
          data: retry,
        })
      ).status(),
    ).toBe(200);
    const databaseFailure = randomUUID();
    await inbound(databaseFailure, {});
    const failed = JSON.stringify({
      type: "email.received",
      data: { email_id: databaseFailure },
    });
    await sql("ALTER TABLE messages RENAME TO messages_unavailable_test");
    try {
      expect(
        (
          await request.post("/api/webhooks/resend", {
            headers: signed(failed),
            data: failed,
          })
        ).status(),
      ).toBe(500);
    } finally {
      await sql("ALTER TABLE messages_unavailable_test RENAME TO messages");
    }
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(failed),
          data: failed,
        })
      ).status(),
    ).toBe(200);
  });
});
