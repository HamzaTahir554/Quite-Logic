import { endpoint, objectId, ApiError } from "@/lib/api";
import { ProjectImage, Project } from "@/lib/models";
import { connectDB } from "@/lib/mongodb";
import { currentAdmin } from "@/lib/admin-auth";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const id = objectId((await context.params).id);
    await connectDB();
    const published = await Project.exists({
      logo: `/api/project-images/${id}`,
      status: "published",
    });
    if (!published && !(await currentAdmin()))
      throw new ApiError(404, "Image not found.");
    const image = await ProjectImage.findById(id).select("+data +thumbnail");
    if (!image) throw new ApiError(404, "Image not found.");
    const data =
      new URL(request.url).searchParams.get("size") === "card" &&
      image.thumbnail
        ? image.thumbnail
        : image.data;
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(data.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  })(request);
}
