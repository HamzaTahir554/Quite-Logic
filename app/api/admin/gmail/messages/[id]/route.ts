import { endpoint, json, body } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { getMessage, labelAction, modifyMessage } from "@/lib/gmail/mailbox";
import { normalizeMessage } from "@/lib/gmail/mime";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) {
  return endpoint(async () => {
    await requireAdmin(request);
    return json(normalizeMessage(await getMessage((await context.params).id)));
  })(request);
}
export function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    await requireAdmin(request);
    const { action } = await body(request, labelAction);
    await modifyMessage((await context.params).id, action);
    return json({ success: true });
  })(request);
}
