import { endpoint, objectId, ApiError } from "@/lib/api";
import { AvatarImage, Review } from "@/lib/models";
import { connectDB } from "@/lib/mongodb";
import { currentAdmin } from "@/lib/admin-auth";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const id = objectId((await context.params).id);
    await connectDB();
    if (
      !(await Review.exists({
        avatarUrl: `/api/avatars/${id}`,
        status: "approved",
      })) &&
      !(await currentAdmin())
    )
      throw new ApiError(404, "Image not found.");
    const image = await AvatarImage.findById(id).select("+data");
    if (!image) throw new ApiError(404, "Image not found.");
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  })(request);
}
