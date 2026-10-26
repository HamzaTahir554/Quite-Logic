import { endpoint, json, ApiError, rateLimit } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Admin, AvatarImage } from "@/lib/models";
import { boundedForm, normalizeAvatar, saveAvatar } from "@/lib/avatar-storage";
export const POST = endpoint(async (request) => {
  const admin = await requireAdmin(request);
  await rateLimit(`avatar:${admin._id}`, 30, 3600);
  const form = await boundedForm(request);
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose an image.");
  const avatarUrl = await saveAvatar(await normalizeAvatar(file), admin._id);
  const old = await Admin.findByIdAndUpdate(admin._id, { $set: { avatarUrl } });
  if (old?.avatarUrl)
    await AvatarImage.deleteOne({ _id: old.avatarUrl.split("/").pop() });
  return json({ avatarUrl });
});
export const DELETE = endpoint(async (request) => {
  const admin = await requireAdmin(request);
  const old = await Admin.findByIdAndUpdate(admin._id, {
    $set: { avatarUrl: "" },
  });
  if (old?.avatarUrl)
    await AvatarImage.deleteOne({ _id: old.avatarUrl.split("/").pop() });
  return json({ avatarUrl: "" });
});
