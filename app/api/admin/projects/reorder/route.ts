import { z } from "zod";
import { endpoint, body, json, objectId, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Project } from "@/lib/models";
import { connectDB } from "@/lib/mongodb";
export const POST = endpoint(async (request) => {
  await requireAdmin(request);
  const input = await body(
    request,
    z
      .object({ id: z.string(), direction: z.enum(["earlier", "later"]) })
      .strict(),
  );
  objectId(input.id);
  const db = await connectDB();
  const session = await db.startSession();
  try {
    // Atlas supports transactions. Normalize ranks so existing ties cannot prevent movement.
    await session.withTransaction(async () => {
      const projects = await Project.find()
        .select("_id")
        .sort({ order: 1, _id: 1 })
        .session(session)
        .lean();
      const index = projects.findIndex(
        (project) => String(project._id) === input.id,
      );
      if (index < 0) throw new ApiError(404, "Project not found.");
      const next = index + (input.direction === "earlier" ? -1 : 1);
      if (next < 0 || next >= projects.length) return;
      [projects[index], projects[next]] = [projects[next], projects[index]];
      await Project.bulkWrite(
        projects.map((project, order) => ({
          updateOne: {
            filter: { _id: project._id },
            update: { $set: { order } },
          },
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return json({ message: "Project order updated." });
});
