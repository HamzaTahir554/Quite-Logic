import { endpoint, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { gmailStatus } from "@/lib/gmail/client";
export const runtime = "nodejs";
export const GET = endpoint(async (request) => {
  await requireAdmin(request);
  return json(await gmailStatus());
});
