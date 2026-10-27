import { endpoint, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { disconnectGmail } from "@/lib/gmail/oauth";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  await requireAdmin(request);
  const revoked = await disconnectGmail();
  return json({
    message: revoked
      ? "Gmail disconnected."
      : "Gmail disconnected locally. Remove Quiet Logic access in your Google account to finish revoking authorization.",
  });
});
