import { CTA, PageHero } from "@/components/ui/Elements";
import Portfolio from "@/components/sections/Portfolio";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { getPublishedProjects } from "@/lib/public-data";
import { Suspense } from "react";
import PortfolioSkeleton from "@/components/projects/PortfolioSkeleton";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Portfolio — Selected Work",
  "Explore digital products, AI systems, and software experiences developed by Quite Logic, alongside illustrative product concepts.",
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
        label="Selected work"
        title="Projects built with clarity, precision and purpose."
        description="A selection of digital products, AI systems and software experiences developed by Quite Logic."
      />
      <Suspense fallback={<PortfolioSkeleton contained />}>
        <ProjectList />
      </Suspense>
      <CTA />
    </div>
  );
}
