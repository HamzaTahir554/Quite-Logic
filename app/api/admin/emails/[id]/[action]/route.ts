import { z } from "zod";
import { database } from "@/lib/database";
import {
  apiError,
  HttpError,
  readJson,
  requireAdmin,
} from "@/lib/admin-security";
import { inboxJson, inboxMessage } from "@/lib/email/inbox";
import { replySchema } from "@/lib/email/validation";
import { sendRecordedEmail } from "@/lib/email/outbound";
export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string; action: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id, action } = await context.params;
    const body = await readJson(request);
    const item = await inboxMessage(id);
    if (action === "read") {
      const input = z.object({ isRead: z.boolean() }).strict().safeParse(body);
      if (!input.success) throw new HttpError(400, "Choose read or unread.");
      await database().query(
        "UPDATE messages SET is_read=$2,updated_at=now() WHERE id=$1",
        [item.id, input.data.isRead],
      );
    } else if (action === "archive") {
      const input = z
        .object({ archived: z.boolean() })
        .strict()
        .safeParse(body);
      if (!input.success) throw new HttpError(400, "Choose an archive action.");
      await database().query(
        "UPDATE messages SET inbox_status=$2,updated_at=now() WHERE id=$1",
        [item.id, input.data.archived ? "archived" : "inbox"],
      );
    } else throw new HttpError(404, "Not found.");
    return inboxJson({ message: "Message updated." });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const admin = await requireAdmin();
    const { id, action } = await context.params;
    if (action !== "reply") throw new HttpError(404, "Not found.");
    const input = replySchema.safeParse(await readJson(request, 48000));
    if (!input.success)
      throw new HttpError(400, "Enter a reply of up to 10,000 characters.");
    const item = await inboxMessage(id);
    const subject = /^re\s*:/i.test(item.subject)
      ? item.subject
      : `Re: ${item.subject}`;
    await sendRecordedEmail({
      adminId: admin.id,
      to: item.from_email,
      clientId: item.client_id,
      subject,
      body: input.data.message,
      messageId: item.id,
      rfcMessageId: item.rfc_message_id,
      requestKey: request.headers.get("idempotency-key")?.slice(0, 100),
    });
    return inboxJson({ message: "Reply sent." });
  } catch (error) {
    return apiError(error);
  }
}
