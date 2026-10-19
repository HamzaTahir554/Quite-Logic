import { z } from "zod";
import { endpoint, json, pagination, searchPattern, body } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { Project } from "@/lib/models";
import { projectSchema } from "@/lib/admin-validation";
import { validateLogoReference } from "@/lib/project-storage";
import { revalidateProjects } from "@/lib/revalidate-projects";
export const GET = endpoint(async (request) => {
  await requireAdmin(request);
  const { skip, limit, page, search, status } = pagination(request);
  const sort = z
    .enum(["order", "newest", "oldest"])
    .parse(new URL(request.url).searchParams.get("sort") || "order");
  const filter = {
    ...(status ? { status: z.enum(["draft", "published"]).parse(status) } : {}),
    ...(search
      ? {
          $or: ["title", "description", "category"].map((key) => ({
            [key]: searchPattern(search),
          })),
        }
      : {}),
  };
  const [items, total, home] = await Promise.all([
    Project.find(filter)
      .sort(
        sort === "newest"
          ? { createdAt: -1, _id: -1 }
          : sort === "oldest"
            ? { createdAt: 1, _id: 1 }
            : { order: 1, _id: 1 },
      )
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
    Project.find({ status: "published", showOnHome: true })
      .select("_id")
      .sort({ order: 1, _id: 1 })
      .limit(3)
      .lean(),
  ]);
  const visible = new Set(home.map((project) => String(project._id)));
  return json({
    items: items.map((project) => ({
      ...project,
      showOnHome: !!project.showOnHome,
      homeVisible: visible.has(String(project._id)),
    })),
    total,
    page,
    limit,
  });
});
export const POST = endpoint(async (request) => {
  await requireAdmin(request);
  const input = await body(request, projectSchema);
  await validateLogoReference(input.logo);
  const project = await Project.create(input);
  revalidateProjects();
  return json({ id: String(project._id), message: "Project created." }, 201);
});
