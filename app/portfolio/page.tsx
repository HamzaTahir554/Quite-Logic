import { CTA, PageHero } from "@/components/ui/Elements";
import Portfolio from "@/components/sections/Portfolio";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { getPublishedProjects } from "@/lib/public-data";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Portfolio & Product Concepts",
  "Explore Quite Logic’s illustrative web, mobile, AI automation, and computer vision product concepts.",
  "/portfolio",
);
export default async function PortfolioPage() {
  const { projects, total, unavailable } = await getPublishedProjects();
  return (
    <>
      <StructuredData path="/portfolio" name="Portfolio" />
      <PageHero
        variant="portfolio"
        label="Ideas made tangible"
        title="Thoughtful by design."
        accent="Useful by nature."
        description="A collection of product explorations that brings our approach to life. Clear interfaces, connected systems, and intelligence with a purpose."
      />
      <Portfolio projects={projects} total={total} unavailable={unavailable} />
      <CTA />
    </>
  );
}
