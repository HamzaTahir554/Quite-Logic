import { projects } from "@/data/content";
export function publishedProjectFilter(category = "") {
  if (!category) return { status: "published" };
  const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const concepts = projects
    .filter((project) =>
      project.categories.some(
        (value) => value.toLowerCase() === category.toLowerCase(),
      ),
    )
    .map((project) => ({
      sourceSlug: project.slug,
      category: project.category,
    }));
  return {
    status: "published",
    $or: [
      { category: new RegExp(`(^|,\\s*)${escaped}(\\s*,|$)`, "i") },
      ...concepts,
    ],
  };
}
