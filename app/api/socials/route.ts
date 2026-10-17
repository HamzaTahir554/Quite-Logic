import { endpoint, json } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { SocialLink } from "@/lib/models";

export const GET = endpoint(async () => {
  await connectDB();
  const records = await SocialLink.find({ enabled: true })
    .select("platform url order")
    .sort({ order: 1, _id: 1 })
    .lean();
  return json({
    links: records.map((link) => ({
      id: String(link._id),
      platform: link.platform,
      url: link.url,
      order: link.order,
    })),
  });
});
