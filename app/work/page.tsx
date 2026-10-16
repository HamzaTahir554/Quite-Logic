import { PageHero, CTA } from "@/components/ui/Elements";
import Process from "@/components/sections/Process";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "How We Work",
  "From idea to production: discovery, UX research, design, architecture, engineering, AI integration, quality assurance, deployment, and maintenance.",
  "/work",
);
export default function WorkPage() {
  return (
    <>
      <StructuredData path="/work" name="How we work" />
      <PageHero
        variant="work"
        label="A considered process"
        title="From idea"
        accent="to production."
        description="Great products come from a clear process and honest collaboration. We make room for discovery, build in focused increments, and keep the next step visible."
      />
      <section className="container collaboration-strip">
        <span>Shared understanding</span>
        <span>Visible progress</span>
        <span>Thoughtful decisions</span>
        <span>Lasting support</span>
      </section>
      <Process detailed />
      <section className="section container handover-panel">
        <div>
          <span className="overline">Beyond launch</span>
          <h2>
            A handover.
            <br />
            <em>Not a disappearing act.</em>
          </h2>
        </div>
        <p>
          Deployment is the beginning of real-world learning. We plan for
          monitoring, documentation, maintenance, and a clear path for
          improvements, so your team knows how to move forward.
        </p>
      </section>
      <CTA />
    </>
  );
}
