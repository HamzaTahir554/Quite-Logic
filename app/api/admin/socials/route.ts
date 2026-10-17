import { endpoint, json, body } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { SocialLink } from "@/lib/models";
import { socialLinkSchema } from "@/lib/admin-validation";

export const GET = endpoint(async (request) => {
  await requireAdmin(request);
  const items = await SocialLink.find().sort({ order: 1, _id: 1 }).lean();
  return json({ items, total: items.length, page: 1, limit: 6 });
});
export const POST = endpoint(async (request) => {
  await requireAdmin(request);
  const link = await SocialLink.create(await body(request, socialLinkSchema));
  return json({ id: String(link._id), message: "Social link added." }, 201);
});
