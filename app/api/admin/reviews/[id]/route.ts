import { z } from "zod";
import { endpoint, json, objectId, body, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Review } from "@/lib/models";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async (req) => {
    await requireAdmin(req);
    const id = objectId((await context.params).id);
    const input = await body(
      req,
      z
        .object({ status: z.enum(["pending", "approved", "rejected"]) })
        .strict(),
    );
    if (
      !(await Review.findByIdAndUpdate(
        id,
        { $set: input },
        { runValidators: true },
      ))
    )
      throw new ApiError(404, "Review not found.");
    return json({ message: "Review updated." });
  })(request);
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async (req) => {
    await requireAdmin(req);
    if (!(await Review.findByIdAndDelete(objectId((await context.params).id))))
      throw new ApiError(404, "Review not found.");
    return json({ message: "Review deleted." });
  })(request);
}
