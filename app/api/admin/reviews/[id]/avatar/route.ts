import { endpoint, json, objectId, ApiError, rateLimit } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Review, AvatarImage } from "@/lib/models";
import { boundedForm, normalizeAvatar, saveAvatar } from "@/lib/avatar-storage";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  return endpoint(async (req) => {
    const admin = await requireAdmin(req);
    await rateLimit(`avatar:${admin._id}`, 30, 3600);
    const id = objectId((await context.params).id);
    if (!(await Review.exists({ _id: id })))
      throw new ApiError(404, "Review not found.");
    const form = await boundedForm(req);
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose an image.");
    const avatarUrl = await saveAvatar(await normalizeAvatar(file), admin._id);
    const old = await Review.findByIdAndUpdate(id, { $set: { avatarUrl } });
    if (old?.avatarUrl)
      await AvatarImage.deleteOne({ _id: old.avatarUrl.split("/").pop() });
    return json({ avatarUrl });
  })(request);
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async (req) => {
    await requireAdmin(req);
    const old = await Review.findByIdAndUpdate(
      objectId((await context.params).id),
      { $set: { avatarUrl: "", useGravatar: false, avatarHash: "" } },
    );
    if (!old) throw new ApiError(404, "Review not found.");
    if (old.avatarUrl)
      await AvatarImage.deleteOne({ _id: old.avatarUrl.split("/").pop() });
    return json({ avatarUrl: "" });
  })(request);
}
