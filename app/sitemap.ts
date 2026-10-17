import type { MetadataRoute } from "next";
import { navigation, projects } from "@/data/content";
import { siteUrl } from "@/lib/seo";
import { Project } from "@/lib/models";
import { connectDB } from "@/lib/mongodb";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let managed: { slug: string }[] = [];
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
      managed = await Project.find({ status: "published", sourceSlug: null })
        .select("slug")
        .lean();
    } catch {
      /* Preserve public sitemap during a database outage. */
    }
  }
  return [
    { url: `${siteUrl}/reviews`, changeFrequency: "weekly", priority: 0.6 },
    ...navigation.map(([, path]) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.8,
    })),
    ...projects.map((p) => ({
      url: `${siteUrl}/portfolio/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...managed.map((p) => ({
      url: `${siteUrl}/portfolio/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
