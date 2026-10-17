import { z } from "zod";
import { database } from "@/lib/database";
import { adminSession, apiError, HttpError } from "@/lib/admin-security";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Image not found.");
    const { rows } = await database().query(
      "SELECT image,published FROM portfolio_projects WHERE id=$1",
      [id],
    );
    if (!rows[0]?.image || (!rows[0].published && !(await adminSession())))
      throw new HttpError(404, "Image not found.");
    return new Response(new Uint8Array(rows[0].image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
