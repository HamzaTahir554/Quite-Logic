import "server-only";
import sharp from "sharp";
import { ProjectImage } from "./models";
import { ApiError } from "./api";

export const maxUploadBytes = 2 * 1024 * 1024;
/** Storage boundary: replace with an object-storage adapter without changing forms. */
export async function storeLogo(
  buffer: Buffer,
  mime: string,
  adminId: unknown,
) {
  if (!buffer.length || buffer.length > maxUploadBytes)
    throw new ApiError(413, "Logo must be at most 2 MB.");
  const formats: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
  };
  if (!formats[mime])
    throw new ApiError(400, "Upload a PNG, JPEG, or WebP image.");
  let data: Buffer;
  try {
    const image = sharp(buffer, {
      limitInputPixels: 16000000,
      animated: false,
      failOn: "warning",
    });
    const info = await image.metadata();
    if (
      info.format !== formats[mime] ||
      !info.width ||
      !info.height ||
      (info.pages || 1) > 1
    )
      throw new Error("Invalid image");
    data = await image
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ApiError(
      400,
      "The file is not a valid static image. Use PNG, JPEG, or WebP up to 16 megapixels.",
    );
  }
  if (data.length > maxUploadBytes)
    throw new ApiError(413, "Processed image is too large.");
  const image = await ProjectImage.create({
    data,
    thumbnail: await sharp(data)
      .resize({
        width: 480,
        height: 320,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer(),
    contentType: "image/webp",
    size: data.length,
    createdBy: adminId,
  });
  return `/api/project-images/${image._id}`;
}
export async function validateLogoReference(logo: string) {
  if (
    logo.startsWith("/api/project-images/") &&
    !(await ProjectImage.exists({ _id: logo.split("/").pop() }))
  )
    throw new ApiError(400, "Upload the logo again.");
  if (logo.startsWith("/projects/")) {
    const { access } = await import("node:fs/promises");
    const { join } = await import("node:path");
    try {
      await access(join(process.cwd(), "public", logo));
    } catch {
      throw new ApiError(400, "Logo does not exist.");
    }
  }
}
