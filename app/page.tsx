import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import SelectedWork from "@/components/sections/SelectedWork";
import ReviewsSection from "@/components/reviews/PublicReviews";
import { CTA } from "@/components/ui/Elements";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Digital Products, AI & Automation",
  "Quite Logic designs and builds high-performance digital products, intelligent automation, and AI-powered systems for modern businesses.",
);
export default function Home() {
  return (
    <>
      <StructuredData />
      <Hero />
      <Services />
      <Suspense fallback={null}>
        <SelectedWork />
      </Suspense>
      <Suspense
        fallback={
          <section
            className="reviews-section section"
            aria-label="Client reviews"
            aria-busy="true"
            style={{ minHeight: 360 }}
          >
            <div className="container" role="status">
              Loading client reviews…
            </div>
          </section>
        }
      >
        <ReviewsSection />
      </Suspense>
      <CTA compact />
    </>
  );
}
