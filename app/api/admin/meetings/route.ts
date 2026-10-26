import { z } from "zod";
import {
  endpoint,
  json,
  pagination,
  searchPattern,
  body,
  rateLimit,
} from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Meeting } from "@/lib/meeting-models";
import { refreshMeeting } from "@/lib/meeting-service";
export const runtime = "nodejs";
export const GET = endpoint(async (request) => {
  await requireAdmin(request);
  const { skip, limit, page, search } = pagination(request);
  const filter = {
    state: { $ne: "holding" },
    ...(search
      ? {
          $or: ["name", "email", "company"].map((field) => ({
            [field]: searchPattern(search),
          })),
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    Meeting.find(filter)
      .select(
        "requestId name email company phone message projectType startTime endTime timezone state createdAt",
      )
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(filter),
  ]);
  return json({ items, total, page, limit });
});
export const POST = endpoint(async (request) => {
  const admin = await requireAdmin(request);
  const { requestId } = await body(
    request,
    z.object({ requestId: z.uuid() }).strict(),
  );
  await rateLimit(`meeting-refresh:${admin._id}`, 60, 60);
  return json(await refreshMeeting(requestId));
});
