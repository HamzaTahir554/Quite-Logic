import { endpoint } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { downloadAttachment } from "@/lib/gmail/mailbox";
export const runtime = "nodejs";
export function GET(
  request: Request,
  context: { params: Promise<{ messageId: string; attachmentId: string }> },
) {
  return endpoint(async () => {
    await requireAdmin(request);
    const p = await context.params;
    return downloadAttachment(
      p.messageId,
      p.attachmentId,
      new URL(request.url).searchParams.get("part") || "",
    );
  })(request);
}
