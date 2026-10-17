import { randomUUID, timingSafeEqual } from "node:crypto";
import { convert } from "html-to-text";
import { z } from "zod";
import { database } from "@/lib/database";
import { saveClient } from "@/lib/client-store";
import { resendClient } from "@/lib/email/resend";
import { emailConfig, mailbox } from "@/lib/email/config";
import { notificationMarker } from "@/lib/email/contact";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (status: number, received: boolean) =>
  Response.json(
    { received },
    { status, headers: { "Cache-Control": "no-store" } },
  );
const header = (headers: Record<string, string> | null, key: string) =>
  Object.entries(headers || {}).find(
    ([name]) => name.toLowerCase() === key,
  )?.[1];
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) return json(503, false);
  let event;
  try {
    // Preserve the raw bytes; never parse and re-serialize a signed body.
    const reader = request.body?.getReader();
    if (!reader) return json(400, false);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 262144) {
        await reader.cancel();
        return json(413, false);
      }
      chunks.push(value);
    }
    event = resendClient().webhooks.verify({
      payload: Buffer.concat(chunks).toString("utf8"),
      headers: {
        id: request.headers.get("svix-id") || "",
        timestamp: request.headers.get("svix-timestamp") || "",
        signature: request.headers.get("svix-signature") || "",
      },
      webhookSecret: secret,
    });
  } catch {
    return json(400, false);
  }
  if (
    !z.object({ type: z.string(), data: z.unknown() }).safeParse(event).success
  )
    return json(400, false);
  if (event.type !== "email.received") return json(200, true);
  const parsed = z.object({ email_id: z.uuid() }).safeParse(event.data);
  const eventId = request.headers.get("svix-id")!;
  if (!parsed.success || eventId.length > 200) return json(400, false);
  try {
    const duplicate = await database().query(
      "SELECT id FROM messages WHERE provider_message_id=$1 OR provider_event_id=$2 LIMIT 1",
      [parsed.data.email_id, eventId],
    );
    if (duplicate.rows.length) return json(200, true);
    // email.received contains metadata; retrieve the actual body from Resend.
    const result = await resendClient().emails.receiving.get(
      parsed.data.email_id,
      { html_format: "cid" },
      { signal: AbortSignal.timeout(15000) },
    );
    if (result.error || !result.data) throw new Error("Receiving fetch failed");
    const email = result.data;
    const config = emailConfig();
    if (
      ![...email.to, ...(email.received_for || [])].some((to) => {
        try {
          return mailbox(to) === config.to;
        } catch {
          return false;
        }
      })
    )
      return json(200, true);
    const marker = header(email.headers, "x-quiet-logic-contact");
    if (marker && /^[a-f\d-]{36}\.[a-f\d]{64}$/.test(marker)) {
      const id = marker.slice(0, 36);
      const expected = notificationMarker(id);
      if (timingSafeEqual(Buffer.from(marker), Buffer.from(expected))) {
        const original = await database().query(
          "SELECT id FROM messages WHERE id=$1 AND source='contact_form'",
          [id],
        );
        if (original.rows.length) return json(200, true);
      }
    }
    const from = mailbox(email.from);
    const name =
      (email.from.includes("<")
        ? email.from
            .slice(0, email.from.indexOf("<"))
            .trim()
            .replace(/^"|"$/g, "")
        : ""
      ).slice(0, 100) || from;
    // Never render email HTML. Conversion strips scripts/styles and produces text.
    const html = email.html?.slice(0, 500000) || null;
    const text = (
      email.text ||
      (html
        ? convert(html, {
            wordwrap: false,
            selectors: [
              { selector: "img", format: "skip" },
              { selector: "script", format: "skip" },
              { selector: "style", format: "skip" },
            ],
          })
        : "No text content supplied.")
    ).slice(0, 100000);
    const rfcId =
      email.message_id &&
      email.message_id.length <= 1000 &&
      !/[\r\n]/.test(email.message_id)
        ? email.message_id
        : null;
    const received = Number.isFinite(Date.parse(email.created_at))
      ? email.created_at
      : new Date().toISOString();
    const connection = await database().connect();
    try {
      await connection.query("BEGIN");
      // Avoid modifying an existing client's name/company from untrusted sender headers.
      const found = await connection.query(
        "SELECT id FROM clients WHERE email=$1",
        [from],
      );
      const client =
        found.rows[0]?.id ||
        (await saveClient(connection, { name, email: from, company: "" }));
      await connection.query(
        `INSERT INTO messages(id,client_id,subject,body,source,from_name,from_email,to_email,html_body,provider_message_id,provider_event_id,rfc_message_id,received_at)
        VALUES($1,$2,$3,$4,'inbound_email',$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [
          randomUUID(),
          client,
          (email.subject || "(No subject)")
            .replace(/[\r\n\x00]/g, " ")
            .slice(0, 180),
          text,
          name,
          from,
          config.to,
          html,
          email.id,
          eventId,
          rfcId,
          received,
        ],
      );
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
    return json(200, true);
  } catch {
    // Non-2xx asks Resend to retry; no event is acknowledged before durable storage.
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        route: "/api/webhooks/resend",
        operation: "resend.receive",
        status: "failed",
      }),
    );
    return json(500, false);
  }
}
