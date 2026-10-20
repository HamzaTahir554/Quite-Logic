import Arrow from "@/components/ui/Arrow";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/Elements";
import ServiceExplorer from "./ServiceExplorer";
export default function Services() {
  return (
    <section className="section container" id="services">
      <SectionHeading
        number="01"
        label="What we do"
        title="Complex challenges."
        accent="Clear solutions."
        description="Five connected disciplines. One considered approach to building software that works beautifully."
        centered
      />
      <ServiceExplorer embedded />
      <div className="section-end">
        <span className="muted small">
          Carefully considered. From interface to infrastructure.
        </span>
        <Link className="text-link" href="/services">
          View All Services <Arrow />
        </Link>
      </div>
    </section>
  );
}
