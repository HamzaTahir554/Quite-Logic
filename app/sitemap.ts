import type { MetadataRoute } from "next";
import { navigation, projects } from "@/data/content";
import { siteUrl } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
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
  ];
}
