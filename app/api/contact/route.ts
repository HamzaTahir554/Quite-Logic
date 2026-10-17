import { randomUUID } from "node:crypto";
import { contactSchema } from "@/lib/contact";
import { contactEmail } from "@/lib/company";
import { deliverInquiry } from "@/lib/contact-delivery";
import { database } from "@/lib/database";
import { saveClient } from "@/lib/client-store";
import { apiError, HttpError, rateLimit, readJson } from "@/lib/admin-security";
import { gmailReady, sendGmail } from "@/lib/gmail";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const parsed = contactSchema.safeParse(await readJson(request, 16000));
    if (!parsed.success)
      throw new HttpError(400, "Please check the form fields and try again.");
    const data = parsed.data;
    await rateLimit("contact:global", 60);
    await rateLimit("contact:" + data.email.toLowerCase(), 5);
    const connection = await database().connect();
    const id = randomUUID();
    try {
      await connection.query("BEGIN");
      const client = await saveClient(connection, data);
      await connection.query(
        "INSERT INTO messages(id,client_id,subject,body,details) VALUES($1,$2,$3,$4,$5)",
        [
          id,
          client,
          data.projectType + " inquiry",
          data.description,
          JSON.stringify({
            phone: data.phone,
            budget: data.budget,
            projectType: data.projectType,
          }),
        ],
      );
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
    let notified = false;
    try {
      if (gmailReady())
        await sendGmail(
          contactEmail,
          `Website inquiry: ${data.projectType}`,
          `${data.name} (${data.email})\n${data.company}\n${data.phone}\nBudget: ${data.budget}\n\n${data.description}`,
          data.email,
        );
      else if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL)
        await deliverInquiry(data, {
          apiKey: process.env.RESEND_API_KEY,
          from: process.env.CONTACT_FROM_EMAIL,
          to: contactEmail,
        });
      else throw new Error("No sender");
      await database().query(
        "UPDATE messages SET delivery_status='Notified' WHERE id=$1",
        [id],
      );
      notified = true;
    } catch {
      // The inquiry remains available to the admin even when notification fails.
      await database().query(
        "UPDATE messages SET delivery_status='Notification failed' WHERE id=$1",
        [id],
      );
    }
    return Response.json({
      message: notified
        ? "Thank you. Your inquiry has been sent to Quite Logic."
        : "Your message has been saved for our team, but the email notification couldn't be delivered. For an urgent request, please email company.quitelogic@gmail.com directly.",
      notified,
    });
  } catch (error) {
    if (error instanceof HttpError && [400, 413, 429].includes(error.status))
      return apiError(error);
    return Response.json(
      {
        message:
          "We couldn't send your message right now. Please try again or email company.quitelogic@gmail.com directly.",
      },
      {
        status: error instanceof HttpError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
