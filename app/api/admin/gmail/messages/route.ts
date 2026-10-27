import { endpoint, json, rateLimit } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { listMail } from "@/lib/gmail/mailbox";
export const runtime = "nodejs";
export const GET = endpoint(async (request) => {
  const admin = await requireAdmin(request);
  await rateLimit("gmail:read:" + admin._id, 120, 60);
  return json(await listMail(request));
});
