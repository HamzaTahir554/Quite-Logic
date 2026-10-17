import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { database } from "../database";
import { digest, HttpError } from "../admin-security";
import { saveClient } from "../client-store";
import type { ContactInput } from "../contact";
import { emailConfig, emailReady } from "./config";
import { SmtpDeliveryError } from "./smtp";
import { sendEmail } from "./resend";
import { messageTemplate } from "./templates";

// A signed header prevents a form notification received by Resend from creating
// a second inbox entry. An external sender cannot forge the marker.
export function notificationMarker(id: string) {
  const key = process.env.SMTP_PASSWORD || process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email provider is not configured.");
  return `${id}.${createHmac("sha256", key).update(id).digest("hex")}`;
}
export async function storeAndNotifyContact(
  data: ContactInput,
  requestKey: string | null,
) {
  const config = emailConfig();
  const body = data.message || data.description;
  const subject =
    data.subject ||
    `New Quiet Logic Inquiry from ${data.name.replace(/[\r\n\x00]/g, " ")}`;
  const fingerprint = digest(
    JSON.stringify({ ...data, email: data.email.toLowerCase(), message: body }),
  );
  if (requestKey && !/^[a-f\d-]{36}$/i.test(requestKey))
    throw new HttpError(400, "Please check the submitted information.");
  const key = requestKey
    ? digest(requestKey + data.email.toLowerCase())
    : digest(fingerprint + Math.floor(Date.now() / 600000));
  const connection = await database().connect();
  let id: string;
  let text: string;
  try {
    await connection.query("BEGIN");
    // Serializes matching submissions even across Node instances.
    await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    const existing = await connection.query(
      "SELECT * FROM messages WHERE contact_key=$1",
      [key],
    );
    const item = existing.rows[0];
    if (item && item.details.fingerprint !== fingerprint)
      throw new HttpError(409, "Please submit your updated message again.");
    if (item?.delivery_status === "Notified") {
      await connection.query("COMMIT");
      return;
    }
    if (
      item?.sending_at &&
      Date.now() - new Date(item.sending_at).getTime() < 120000
    )
      throw new HttpError(
        429,
        "Your message is being sent. Please wait a moment.",
      );
    if (
      item &&
      ["Sending", "Delivery uncertain"].includes(item.delivery_status)
    )
      throw new HttpError(
        409,
        "Please contact us directly before resending this inquiry.",
      );
    // Resend idempotency expires after 24 hours; do not resend an uncertain old send.
    if (item && Date.now() - new Date(item.created_at).getTime() > 23 * 3600000)
      throw new HttpError(
        409,
        "Please contact us directly about this inquiry.",
      );
    id = item?.id || randomUUID();
    text =
      item?.details.notificationText ||
      `Name: ${data.name}\nEmail: ${data.email}\nSubject: ${subject}\nCompany: ${data.company || "Not provided"}\nPhone: ${data.phone || "Not provided"}\nService: ${data.projectType}\nBudget: ${data.budget}\n\nMessage:\n${body}\n\nSubmitted: ${new Date().toISOString()}`;
    if (!item) {
      const client = await saveClient(connection, data);
      await connection.query(
        `INSERT INTO messages(id,client_id,subject,body,details,from_name,from_email,to_email,contact_key,received_at,delivery_status,sending_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),'Sending',now())`,
        [
          id,
          client,
          subject,
          body,
          JSON.stringify({
            phone: data.phone,
            budget: data.budget,
            projectType: data.projectType,
            fingerprint,
            notificationText: text,
          }),
          data.name,
          data.email.toLowerCase(),
          config.to,
          key,
        ],
      );
    } else
      await connection.query(
        "UPDATE messages SET sending_at=now(),delivery_status='Sending' WHERE id=$1",
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
    if (!emailReady()) throw new SmtpDeliveryError(true);
    const providerId = await sendEmail({
      to: config.to,
      subject,
      text,
      html: messageTemplate("New Contact Request", text),
      replyTo: data.email,
      headers: { "X-Quiet-Logic-Contact": notificationMarker(id) },
      idempotencyKey: `contact/${id}`,
    });
    await database().query(
      "UPDATE messages SET delivery_status='Notified',provider_message_id=$2,sending_at=NULL,updated_at=now() WHERE id=$1",
      [id, providerId],
    );
  } catch (error) {
    const safe = error instanceof SmtpDeliveryError && error.safeToRetry;
    await database().query(
      "UPDATE messages SET delivery_status=$2,sending_at=NULL,updated_at=now() WHERE id=$1",
      [id, safe ? "Notification failed" : "Delivery uncertain"],
    );
    throw new Error("Notification failed");
  }
}
