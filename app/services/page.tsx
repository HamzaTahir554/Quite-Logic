import { PageHero, CTA } from "@/components/ui/Elements";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import ServicesShowcase from "@/components/sections/ServicesShowcase";
export const metadata = pageMetadata(
  "Software Development Services",
  "Explore Quite Logic’s web, mobile, AI automation, computer vision, and custom software development services.",
  "/services",
);
export default function ServicesPage() {
  return (
    <>
      <StructuredData path="/services" name="Services" />
      <PageHero
        variant="services"
        label="Our expertise"
        title="Engineering digital experiences"
        accent="that make complex things feel simple."
        description="The right technology, thoughtfully applied. From your first prototype to the systems behind your business."
      />
      <ServicesShowcase />
      <CTA />
    </>
  );
}
