import { z } from "zod";
import { endpoint, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { listGmailThreads } from "@/lib/gmail";
export const GET = endpoint(async (request) => {
  await requireAdmin(request);
  const url = new URL(request.url);
  const folder = z.enum(["inbox", "sent"]).parse(url.searchParams.get("folder") || "inbox");
  const search = (url.searchParams.get("q") || "").slice(0, 200);
  return json({ items: await listGmailThreads(folder, search) });
});
