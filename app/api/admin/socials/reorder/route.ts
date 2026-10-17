import { z } from "zod";
import { endpoint, body, json, objectId, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { SocialLink } from "@/lib/models";
import { connectDB } from "@/lib/mongodb";
export const POST = endpoint(async (request) => {
  await requireAdmin(request);
  const input = await body(
    request,
    z
      .object({
        id: z.string(),
        direction: z.enum(["earlier", "later"]),
      })
      .strict(),
  );
  objectId(input.id);
  const db = await connectDB();
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      const links = await SocialLink.find()
        .select("_id")
        .sort({ order: 1, _id: 1 })
        .session(session)
        .lean();
      const index = links.findIndex((link) => String(link._id) === input.id);
      if (index < 0) throw new ApiError(404, "Social link not found.");
      const next = index + (input.direction === "earlier" ? -1 : 1);
      if (next < 0 || next >= links.length) return;
      [links[index], links[next]] = [links[next], links[index]];
      await SocialLink.bulkWrite(
        links.map((link, order) => ({
          updateOne: { filter: { _id: link._id }, update: { $set: { order } } },
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return json({ message: "Social link order updated." });
});
