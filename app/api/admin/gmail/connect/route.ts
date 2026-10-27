import { endpoint, json, rateLimit } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { beginGmailOAuth } from "@/lib/gmail/oauth";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  const admin = await requireAdmin(request);
  await rateLimit("gmail:connect:" + admin._id, 10, 600);
  return json({ url: await beginGmailOAuth(request) });
});
