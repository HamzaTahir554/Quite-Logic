import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "../database";
import { digest, HttpError, rateLimit } from "../admin-security";
import { saveClient } from "../client-store";
import { sendEmail } from "./resend";
import { SmtpDeliveryError } from "./smtp";

export async function sendRecordedEmail(input: {
  adminId: string;
  to: string;
  clientId?: string;
  subject: string;
  body: string;
  messageId?: string;
  rfcMessageId?: string | null;
  requestKey?: string | null;
}) {
  await rateLimit("admin:email:" + input.adminId, 30, 3600);
  const connection = await database().connect();
  const key = digest(
    input.adminId +
      (input.requestKey ||
        JSON.stringify({
          to: input.to,
          subject: input.subject,
          body: input.body,
          messageId: input.messageId,
          bucket: Math.floor(Date.now() / 600000),
        })),
  );
  let id: string;
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    const { rows } = await connection.query(
      "SELECT * FROM email_history WHERE idempotency_key=$1",
      [key],
    );
    const existing = rows[0];
    if (
      existing &&
      (existing.recipient !== input.to ||
        existing.subject !== input.subject ||
        existing.body !== input.body ||
        existing.message_id !== (input.messageId || null))
    )
      throw new HttpError(409, "Please submit your updated email again.");
    if (existing?.status === "Sent") {
      await connection.query("COMMIT");
      return existing.id as string;
    }
    if (
      existing?.sending_at &&
      Date.now() - new Date(existing.sending_at).getTime() < 120000
    )
      throw new HttpError(409, "This email is already being sent.");
    if (existing && ["Sending", "Delivery uncertain"].includes(existing.status))
      throw new HttpError(
        409,
        "Delivery is uncertain. Check your mailbox and email history before sending again.",
      );
    if (
      existing &&
      Date.now() - new Date(existing.created_at).getTime() > 23 * 3600000
    )
      throw new HttpError(
        409,
        "Check email history before sending a new email.",
      );
    id = existing?.id || randomUUID();
    if (!existing) {
      const known = input.clientId
        ? null
        : await connection.query("SELECT id FROM clients WHERE email=$1", [
            input.to,
          ]);
      const client =
        input.clientId ||
        known?.rows[0]?.id ||
        (await saveClient(connection, {
          email: input.to,
          name: input.to,
          company: "",
        }));
      await connection.query(
        "INSERT INTO email_history(id,client_id,admin_id,recipient,subject,body,message_id,idempotency_key,sending_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())",
        [
          id,
          client,
          input.adminId,
          input.to,
          input.subject,
          input.body,
          input.messageId || null,
          key,
        ],
      );
    } else
      await connection.query(
        "UPDATE email_history SET status='Sending',sending_at=now() WHERE id=$1",
        [id],
      );
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
  try {
    const reference = input.rfcMessageId;
    const headers =
      reference && /^<[^<>\s\r\n]{1,900}>$/.test(reference)
        ? { "In-Reply-To": reference, References: reference }
        : undefined;
    const providerId = await sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.body,
      reply: true,
      headers,
      idempotencyKey: `admin/${id}`,
    });
    // Update reply state and history together, including retries after an uncertain send.
    await database().query(
      `WITH sent AS (UPDATE email_history SET status='Sent',provider_message_id=$2,sent_at=now(),sending_at=NULL WHERE id=$1 RETURNING message_id)
      UPDATE messages SET inbox_status='replied',updated_at=now() WHERE id=(SELECT message_id FROM sent)`,
      [id, providerId],
    );
    return id;
  } catch (error) {
    const safe = error instanceof SmtpDeliveryError && error.safeToRetry;
    await database().query(
      "UPDATE email_history SET status=$2,sending_at=NULL WHERE id=$1",
      [id, safe ? "Failed" : "Delivery uncertain"],
    );
    throw new HttpError(
      502,
      "Email could not be confirmed as sent. Check history before retrying.",
    );
  }
}
