import { z } from "zod";
import { endpoint, json, pagination, searchPattern } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Review } from "@/lib/models";
export const GET = endpoint(async (request) => {
  await requireAdmin(request);
  const { skip, limit, page, search, status } = pagination(request);
  const filter = {
    ...(status
      ? { status: z.enum(["pending", "approved", "rejected"]).parse(status) }
      : {}),
    ...(search
      ? {
          $or: ["clientName", "company", "review"].map((key) => ({
            [key]: searchPattern(search),
          })),
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .select("+email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return json({ items, total, page, limit });
});
