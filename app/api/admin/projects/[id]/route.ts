import { endpoint, json, objectId, body, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Project } from "@/lib/models";
import { projectSchema } from "@/lib/admin-validation";
import { validateLogoReference } from "@/lib/project-storage";
import { revalidateProjects } from "@/lib/revalidate-projects";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async (req) => {
    await requireAdmin(req);
    const id = objectId((await context.params).id);
    const input = await body(
      req,
      projectSchema
        .partial()
        .refine(
          (value) => Object.keys(value).length > 0,
          "No changes supplied.",
        ),
    );
    if (input.logo) await validateLogoReference(input.logo);
    if (
      !(await Project.findByIdAndUpdate(
        id,
        { $set: input },
        { runValidators: true },
      ))
    )
      throw new ApiError(404, "Project not found.");
    revalidateProjects();
    return json({ message: "Project updated." });
  })(request);
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async (req) => {
    await requireAdmin(req);
    if (!(await Project.findByIdAndDelete(objectId((await context.params).id))))
      throw new ApiError(404, "Project not found.");
    revalidateProjects();
    return json({ message: "Project deleted." });
  })(request);
}
