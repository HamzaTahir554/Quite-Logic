import "server-only";
import { cache } from "react";
import { connectDB } from "./mongodb";
import {
  Project,
  Review,
  type ProjectRecord,
  type ReviewRecord,
} from "./models";
import type { HomeProject, PortfolioProject } from "./portfolio";
import type { PublicReview } from "./reviews";
import { withPublicReadTimeout } from "./public-read";

export function publicProject(
  p: ProjectRecord & { _id: unknown },
): PortfolioProject {
  return {
    id: String(p._id),
    title: p.title,
    description: p.description,
    category: p.category,
    image_url: p.logo,
    project_url: `/portfolio/${p.slug}`,
    source_slug: p.sourceSlug || null,
    short_description: p.shortDescription || "",
    featured: p.featured || false,
  };
}
export function publicReview(r: ReviewRecord & { _id: unknown }): PublicReview {
  return {
    id: String(r._id),
    name: r.clientName,
    company: r.company,
    role: r.role,
    service: r.service,
    rating: r.rating,
    body: r.review,
    created_at: r.createdAt.toISOString(),
    image_url: null,
  };
}
export const getPublishedProjects = cache(async () => {
  if (!process.env.MONGODB_URI)
    return {
      projects: [],
      total: 0,
      categories: [] as string[],
      unavailable: true,
    };
  try {
    await connectDB();
    const filter = { status: "published" };
    const [records, total, categories] = await Promise.all([
      Project.find(filter).sort({ order: 1, _id: 1 }).limit(24).lean(),
      Project.countDocuments(filter),
      Project.distinct("category", filter),
    ]);
    return {
      projects: records.map(publicProject),
      total,
      categories: categories.flatMap((category: string) =>
        category
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
      unavailable: false,
    };
  } catch {
    return {
      projects: [],
      total: 0,
      categories: [] as string[],
      unavailable: true,
    };
  }
});
// React cache deduplicates only within this request. Home is force-dynamic,
// so every new visit reads current selections without a deployment or TTL.
export const getHomeProjects = cache(async (): Promise<HomeProject[]> => {
  if (!process.env.MONGODB_URI) return [];
  try {
    return await withPublicReadTimeout(async () => {
      await connectDB();
      const records = await Project.find({
        status: "published",
        showOnHome: true,
      })
        .select(
          "title slug logo category shortDescription description technologies",
        )
        .sort({ order: 1, _id: 1 })
        .limit(3)
        .maxTimeMS(4000)
        .lean();
      return records.map((project) => ({
        id: String(project._id),
        title: project.title,
        slug: project.slug,
        logo: project.logo,
        category: project.category || "",
        description: (project.shortDescription || project.description).slice(
          0,
          600,
        ),
        technologies: project.technologies || [],
      }));
    });
  } catch {
    return [];
  }
});
export const getApprovedReviews = cache(async (full: boolean) => {
  if (!process.env.MONGODB_URI)
    return { reviews: [], total: 0, unavailable: true };
  try {
    return await withPublicReadTimeout(async () => {
      await connectDB();
      const filter = { status: "approved" };
      const [records, total] = await Promise.all([
        Review.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .limit(full ? 24 : 4)
          .maxTimeMS(4000)
          .lean(),
        Review.countDocuments(filter).maxTimeMS(4000),
      ]);
      return { reviews: records.map(publicReview), total, unavailable: false };
    });
  } catch {
    return { reviews: [], total: 0, unavailable: true };
  }
});
