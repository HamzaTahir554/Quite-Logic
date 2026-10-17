import "server-only";
import sharp from "sharp";
import { HttpError } from "./admin-security";
export async function projectImage(value: string) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
    value,
  );
  if (!match) throw new HttpError(400, "Choose a PNG, JPEG, or WebP logo.");
  try {
    const bytes = Buffer.from(match[2], "base64");
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";
    if (bytes.length > 2_000_000 || !(png || jpeg || webp)) throw new Error();
    return await sharp(bytes, { limitInputPixels: 16_000_000 })
      .rotate()
      .resize(768, 768, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      "Use a valid PNG, JPEG, or WebP image, up to 2 MB and 16 megapixels.",
    );
  }
}
