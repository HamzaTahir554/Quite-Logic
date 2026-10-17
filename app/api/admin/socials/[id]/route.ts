import { endpoint, json, objectId, body, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { SocialLink } from "@/lib/models";
import { socialLinkSchema } from "@/lib/admin-validation";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async (req) => {
    await requireAdmin(req);
    const id = objectId((await context.params).id);
    const input = await body(
      req,
      socialLinkSchema
        .partial()
        .refine(
          (value) => Object.keys(value).length > 0,
          "No changes supplied.",
        ),
    );
    if (
      !(await SocialLink.findByIdAndUpdate(
        id,
        { $set: input },
        { runValidators: true },
      ))
    )
      throw new ApiError(404, "Social link not found.");
    return json({ message: "Social link saved." });
  })(request);
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async (req) => {
    await requireAdmin(req);
    if (
      !(await SocialLink.findByIdAndDelete(objectId((await context.params).id)))
    )
      throw new ApiError(404, "Social link not found.");
    return json({ message: "Social link deleted." });
  })(request);
}
