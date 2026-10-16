import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import SelectedWork from "@/components/sections/SelectedWork";
import ReviewsSection from "@/components/reviews/PublicReviews";
import { CTA } from "@/components/ui/Elements";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Digital Products, AI & Automation",
  "Quite Logic designs and builds high-performance digital products, intelligent automation, and AI-powered systems for modern businesses.",
);
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <>
      <StructuredData />
      <Hero />
      <Services />
      <SelectedWork />
      <ReviewsSection />
      <CTA compact />
    </>
  );
}
