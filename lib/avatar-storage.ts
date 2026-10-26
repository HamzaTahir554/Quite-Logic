import "server-only";
import sharp from "sharp";
import { ApiError } from "./api";
import { AvatarImage } from "./models";
export const avatarMaxBytes = 2 * 1024 * 1024;
export async function boundedForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Choose an image.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > avatarMaxBytes + 65536) {
      await reader.cancel();
      throw new ApiError(413, "Image must be at most 2 MB.");
    }
    chunks.push(value);
  }
  try {
    return await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") || "" },
      body: Buffer.concat(chunks),
    }).formData();
  } catch {
    throw new ApiError(400, "Invalid image upload.");
  }
}
export async function normalizeAvatar(file: File) {
  if (!file.size || file.size > avatarMaxBytes)
    throw new ApiError(413, "Image must be at most 2 MB.");
  const formats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!formats[file.type]) throw new ApiError(400, "Use JPEG, PNG or WebP.");
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 16000000,
      animated: false,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (metadata.format !== formats[file.type] || (metadata.pages || 1) > 1)
      throw new Error("Invalid image.");
    return await image
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ApiError(
      400,
      "Use a valid static JPEG, PNG or WebP image up to 16 megapixels.",
    );
  }
}
export async function saveAvatar(data: Buffer, owner: unknown) {
  const image = await AvatarImage.create({ data, createdBy: owner });
  return `/api/avatars/${image._id}`;
}
