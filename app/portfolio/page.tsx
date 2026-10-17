import { CTA, PageHero } from "@/components/ui/Elements";
import Portfolio from "@/components/sections/Portfolio";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { publicProjects } from "@/lib/portfolio-store";
import type { ManagedProject } from "@/lib/portfolio";
export const metadata = pageMetadata(
  "Portfolio & Product Concepts",
  "Explore Quite Logic’s illustrative web, mobile, AI automation, and computer vision product concepts.",
  "/portfolio",
);
export const dynamic = "force-dynamic";
export default async function PortfolioPage() {
  let projects: ManagedProject[] = [];
  let unavailable = false;
  try {
    projects = await publicProjects();
  } catch {
    unavailable = true;
  }
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
      <Portfolio projects={projects} unavailable={unavailable} />
      <CTA />
    </>
  );
}
