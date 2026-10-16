import { database } from "@/lib/database";
import { apiError, HttpError, adminSession } from "@/lib/admin-security";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new HttpError(404, "Image not found.");
    const { rows } = await database().query(
      "SELECT image,status FROM reviews WHERE id=$1",
      [id],
    );
    if (
      !rows[0]?.image ||
      (rows[0].status !== "Approved" && !(await adminSession()))
    )
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
