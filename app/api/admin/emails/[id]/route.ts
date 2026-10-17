import { apiError, requireAdmin, sameOrigin } from "@/lib/admin-security";
import { database } from "@/lib/database";
import { inboxJson, inboxMessage } from "@/lib/email/inbox";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const item = await inboxMessage((await context.params).id);
    const replies = await database().query(
      "SELECT id,recipient,subject,body,status,created_at,sent_at FROM email_history WHERE message_id=$1 ORDER BY created_at DESC LIMIT 25",
      [item.id],
    );
    return inboxJson({ item, replies: replies.rows });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin();
    sameOrigin(request);
    const item = await inboxMessage((await context.params).id);
    await database().query(
      "UPDATE messages SET deleted_at=now(),updated_at=now() WHERE id=$1",
      [item.id],
    );
    return inboxJson({ message: "Message deleted." });
  } catch (error) {
    return apiError(error);
  }
}
