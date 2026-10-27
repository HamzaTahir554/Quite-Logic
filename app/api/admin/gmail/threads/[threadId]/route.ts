import { endpoint, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { getThread } from "@/lib/gmail/mailbox";
export const runtime = "nodejs";
export function GET(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  return endpoint(async () => {
    await requireAdmin(request);
    return json(await getThread((await context.params).threadId));
  })(request);
}
