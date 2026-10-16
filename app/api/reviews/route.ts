import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { database } from "@/lib/database";
import { apiError, HttpError, rateLimit, readJson } from "@/lib/admin-security";
import { reviewSchema } from "@/lib/reviews";
import { saveClient } from "@/lib/client-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const page = Math.max(
      0,
      Math.min(
        10000,
        Math.floor(Number(new URL(request.url).searchParams.get("page")) || 0),
      ),
    );
    const { rows } = await database().query(
      "SELECT id,name,company,role,service,rating,body,created_at,(image IS NOT NULL) AS has_image FROM reviews WHERE status='Approved' ORDER BY created_at DESC,id LIMIT 12 OFFSET $1",
      [page * 12],
    );
    return Response.json(
      { reviews: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const parsed = reviewSchema.safeParse(await readJson(request, 2_850_000));
    if (!parsed.success)
      throw new HttpError(
        400,
        "Please check all fields, consent, and your review (20–3,000 characters).",
      );
    const input = parsed.data;
    await rateLimit("review:global", 100);
    await rateLimit("review:" + input.email.toLowerCase(), 3, 3600);
    let image: Buffer | null = null;
    if (input.image) {
      const match =
        /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
          input.image,
        );
      if (!match)
        throw new HttpError(400, "Use a PNG, JPEG, or WebP profile image.");
      try {
        const bytes = Buffer.from(match[2], "base64");
        const png = bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        const webp =
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
        if (bytes.length > 2_000_000 || !(png || jpeg || webp))
          throw new Error("Invalid image format");
        image = await sharp(bytes, {
          limitInputPixels: 16_000_000,
        })
          .rotate()
          .resize(256, 256, { fit: "cover" })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        throw new HttpError(
          400,
          "Choose a valid PNG, JPEG, or WebP image up to 16 megapixels.",
        );
      }
    }
    const connection = await database().connect();
    try {
      await connection.query("BEGIN");
      const client = await saveClient(connection, input);
      await connection.query(
        "INSERT INTO reviews(id,client_id,name,company,role,service,rating,body,image,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending')",
        [
          randomUUID(),
          client,
          input.name,
          input.company,
          input.role,
          input.service,
          input.rating,
          input.body,
          image,
        ],
      );
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
    return Response.json(
      {
        message:
          "Thank you. Your review is pending approval and is not public yet.",
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
