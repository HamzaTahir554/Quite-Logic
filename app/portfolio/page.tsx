import { CTA, PageHero } from "@/components/ui/Elements";
import Portfolio from "@/components/sections/Portfolio";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { getPublishedProjects } from "@/lib/public-data";
import { Suspense } from "react";
import PortfolioSkeleton from "@/components/projects/PortfolioSkeleton";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Portfolio & Product Concepts",
  "Explore Quite Logic’s illustrative web, mobile, AI automation, and computer vision product concepts.",
  "/portfolio",
);
async function ProjectList() {
  const { projects, total, categories, unavailable } =
    await getPublishedProjects();
  return (
    <Portfolio
      projects={projects}
      total={total}
      categories={categories}
      unavailable={unavailable}
    />
  );
}
export default function PortfolioPage() {
  return (
    <div className="portfolio-page">
      <StructuredData path="/portfolio" name="Portfolio" />
      <PageHero
        variant="portfolio"
        label="Ideas made tangible"
        title="Thoughtful by design."
        accent="Useful by nature."
        description="A collection of product explorations that brings our approach to life. Clear interfaces, connected systems, and intelligence with a purpose."
      />
      <Suspense fallback={<PortfolioSkeleton contained />}>
        <ProjectList />
      </Suspense>
      <CTA />
    </div>
  );
}
