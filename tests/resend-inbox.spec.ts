import { test, expect, type APIRequestContext } from "@playwright/test";
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
async function login(request: APIRequestContext) {
  const response = await request.post("/api/admin/login", {
    headers,
    data: { email: "admin@example.test", password: "Local-Test-Only-123456!" },
  });
  expect(response.status()).toBe(200);
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
  test("Inbox protects every action, searches and paginates, replies safely, archives, soft deletes and works on mobile", async ({
    page,
    request,
  }) => {
    const id = randomUUID();
    const from = `inbox-${randomUUID()}@example.test`;
    const subject = `Inbox workflow ${id}`;
    const batchSubject = `Batch pagination ${id}`;
    await inbound(id, { from: `Inbox Client <${from}>`, subject });
    const payload = JSON.stringify({
      type: "email.received",
      data: { email_id: id },
    });
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(payload),
          data: payload,
        })
      ).status(),
    ).toBe(200);
    const item = (
      await sql("SELECT * FROM messages WHERE provider_message_id=$1", [id])
    ).rows[0];
    for (const [path, method, body] of [
      ["/api/admin/emails", "GET"],
      [`/api/admin/emails/${item.id}`, "GET"],
      ["/api/admin/emails", "POST", {}],
      [`/api/admin/emails/${item.id}/read`, "PATCH", { isRead: true }],
      [`/api/admin/emails/${item.id}/archive`, "PATCH", { archived: true }],
      [`/api/admin/emails/${item.id}/reply`, "POST", { message: "test" }],
      [`/api/admin/emails/${item.id}`, "DELETE"],
    ] as const)
      expect(
        (
          await request.fetch(path, {
            method,
            headers,
            ...(body ? { data: body } : {}),
          })
        ).status(),
      ).toBe(401);
    await page.goto("/admin/inbox");
    await expect(page).toHaveURL(/\/admin\/login/);
    await login(page.request);
    for (let i = 0; i < 28; i++)
      await sql(
        "INSERT INTO messages(id,client_id,subject,body,from_name,from_email,received_at) VALUES($1,$2,$3,'Pagination test body','Batch Client',$4,now())",
        [randomUUID(), item.client_id, `${batchSubject} ${i}`, from],
      );
    const batch = await (
      await page.request.get(
        `/api/admin/emails?q=${encodeURIComponent(batchSubject)}`,
      )
    ).json();
    expect(batch.items).toHaveLength(25);
    expect(batch.total).toBe(28);
    expect(
      (
        await (
          await page.request.get(
            `/api/admin/emails?q=${encodeURIComponent(batchSubject)}&page=1`,
          )
        ).json()
      ).items,
    ).toHaveLength(3);
    const detail = await (
      await page.request.get(`/api/admin/emails/${item.id}`)
    ).json();
    expect(detail.item.body).toContain("direct inbound");
    expect(detail.item.html_body).toBeUndefined();
    expect(
      (
        await page.request.patch(`/api/admin/emails/${item.id}/read`, {
          headers: { Origin: "https://evil.test" },
          data: { isRead: true },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post(`/api/admin/emails/${item.id}/reply`, {
          headers,
          data: { message: "" },
        })
      ).status(),
    ).toBe(400);
    const failed = await page.request.post(
      `/api/admin/emails/${item.id}/reply`,
      { headers, data: { message: "[FAIL] Simulated reply failure" } },
    );
    expect(failed.status()).toBe(502);
    expect(
      (await sql("SELECT inbox_status FROM messages WHERE id=$1", [item.id]))
        .rows[0].inbox_status,
    ).toBe("inbox");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/inbox");
    await page.getByLabel("Search messages").fill(subject);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const row = page.locator(".inbox-row").filter({ hasText: subject });
    await expect(row).toHaveCount(1);
    await row.click();
    await expect(
      page.getByRole("region", { name: "Message detail" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mark unread", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Mark read", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Reply", { exact: true })
      .fill("Thank you for your inquiry. We can help with this project.");
    await page.getByRole("button", { name: "Send reply", exact: true }).click();
    await expect(
      page.locator(".admin-inbox").getByRole("status").first(),
    ).toHaveText("Reply sent.");
    const sent = (await mail()).find(
      (entry) => entry.to === from && entry.subject === `Re: ${subject}`,
    );
    expect(sent.from).toBe("Quiet Logic <contact@quitelogic.com>");
    expect(sent.replyTo).toBe("contact@quitelogic.com");
    expect(sent.headers["In-Reply-To"]).toBe(item.rfc_message_id);
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Move to inbox", exact: true }),
    ).toBeVisible();
    expect(
      (
        await (
          await page.request.get(
            `/api/admin/emails?status=archived&q=${encodeURIComponent(subject)}`,
          )
        ).json()
      ).total,
    ).toBe(1);
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const bounds = await page
        .locator(".admin-inbox .admin-toolbar input")
        .boundingBox();
      expect(bounds!.width).toBeGreaterThan(180);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "qa/screenshots/resend-inbox-mobile.png",
      fullPage: true,
    });
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Message detail" }),
    ).toHaveCount(0);
    expect(
      (await page.request.get(`/api/admin/emails/${item.id}`)).status(),
    ).toBe(404);
    expect(
      (await sql("SELECT deleted_at FROM messages WHERE id=$1", [item.id]))
        .rows[0].deleted_at,
    ).not.toBeNull();
    expect(
      (await sql("SELECT id FROM clients WHERE id=$1", [item.client_id])).rows,
    ).toHaveLength(1);
    expect(errors).toEqual([]);
  });
  test("admin compose validates, keeps client details, deduplicates, and avoids repeated reply prefixes", async ({
    page,
    request,
  }) => {
    await login(request);
    const to = `compose-${randomUUID()}@example.test`;
    const clientId = randomUUID();
    await sql(
      "INSERT INTO clients(id,email,name,company) VALUES($1,$2,'Original Client','Original Company')",
      [clientId, to],
    );
    const key = randomUUID();
    const input = {
      to,
      subject: "Compose integration test",
      body: "A professional message sent from the existing dashboard.",
    };
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request.post("/api/admin/emails", {
            headers: { ...headers, "Idempotency-Key": key },
            data: input,
          })
        ).status(),
      ).toBe(200);
    expect((await mail()).filter((entry) => entry.to === to)).toHaveLength(1);
    expect(
      (await sql("SELECT name,company FROM clients WHERE id=$1", [clientId]))
        .rows[0],
    ).toEqual({ name: "Original Client", company: "Original Company" });
    for (const invalid of [
      { ...input, to: "invalid" },
      { ...input, subject: "bad\r\nBcc: x@test.com" },
      { ...input, body: " " },
      { ...input, from: "attacker@evil.test" },
    ])
      expect(
        (
          await request.post("/api/admin/emails", { headers, data: invalid })
        ).status(),
      ).toBe(400);
    const incomingId = randomUUID();
    await inbound(incomingId, { from: to, subject: "Re: Existing thread" });
    const payload = JSON.stringify({
      type: "email.received",
      data: { email_id: incomingId },
    });
    expect(
      (
        await request.post("/api/webhooks/resend", {
          headers: signed(payload),
          data: payload,
        })
      ).status(),
    ).toBe(200);
    const message = (
      await sql("SELECT id FROM messages WHERE provider_message_id=$1", [
        incomingId,
      ])
    ).rows[0];
    expect(
      (
        await request.post(`/api/admin/emails/${message.id}/reply`, {
          headers,
          data: { message: "A follow-up reply on the existing thread." },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await mail()).find(
        (entry) => entry.to === to && entry.subject === "Re: Existing thread",
      ),
    ).toBeTruthy();
    await login(page.request);
    await page.goto("/admin/inbox");
    await page
      .getByRole("button", { name: "Compose email", exact: true })
      .click();
    await page.getByLabel("To", { exact: true }).fill(`ui-${to}`);
    await page
      .getByLabel("Subject", { exact: true })
      .fill("Compose from Inbox UI");
    await page
      .getByLabel("Message", { exact: true })
      .fill("A test composed through the actual admin form.");
    await page.getByRole("button", { name: "Send email", exact: true }).click();
    await expect(
      page.locator(".admin-inbox").getByRole("status").first(),
    ).toHaveText("Email sent.");
    await expect(page.getByLabel("To", { exact: true })).toHaveValue("");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: "qa/screenshots/resend-inbox-desktop.png",
      fullPage: true,
    });
  });
});
