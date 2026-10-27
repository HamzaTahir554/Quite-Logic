import { endpoint, json, rateLimit } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { sendMail } from "@/lib/gmail/send";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  const admin = await requireAdmin(request);
  await rateLimit("gmail:send:" + admin._id, 20, 60);
  return json(await sendMail(request, false));
});
