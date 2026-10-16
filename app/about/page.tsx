import { CTA, PageHero, SectionHeading } from "@/components/ui/Elements";
import AboutPreview from "@/components/sections/AboutPreview";
import Reveal from "@/components/ui/Reveal";
import StructuredData from "@/components/seo/StructuredData";
import { pageMetadata } from "@/lib/seo";
import PhilosophyStory from "@/components/sections/PhilosophyStory";
export const metadata = pageMetadata(
  "About the Studio",
  "Meet the thinking behind Quite Logic: precise engineering, thoughtful interfaces, transparent collaboration, and maintainable software.",
  "/about",
);
const values = [
  [
    "Precision",
    "We care about the details that make a product dependable. Clear decisions, careful implementation, and a high standard of finish.",
  ],
  [
    "Simplicity",
    "We reduce unnecessary complexity so your team and your users can focus on what matters.",
  ],
  [
    "Reliability",
    "We favor understandable architecture, considered testing, and foundations that are easier to maintain.",
  ],
  [
    "Curiosity",
    "We ask useful questions and explore new tools with a clear purpose, rather than following technology for its own sake.",
  ],
  [
    "Transparency",
    "We communicate tradeoffs, make progress visible, and keep you involved in the decisions that shape your product.",
  ],
];
export default function AboutPage() {
  return (
    <>
      <StructuredData path="/about" name="About" />
      <PageHero
        variant="about"
        label="The thinking behind the work"
        title="A quieter approach."
        accent="A clearer outcome."
        description="We are a software studio bringing engineering, intelligent systems, and thoughtful design together. We build with intention, so your product can move forward with confidence."
      />
      <AboutPreview />
      <PhilosophyStory />
      <section className="section container">
        <div className="mission-grid">
          <Reveal>
            <span className="overline">Our mission</span>
            <h2>
              Make technology
              <br />
              <em>more useful.</em>
            </h2>
            <p>
              Help teams turn complex problems into reliable digital products
              that are clear to use, easy to evolve, and built around real
              needs.
            </p>
          </Reveal>
          <Reveal>
            <span className="overline">Our vision</span>
            <h2>
              Less friction.
              <br />
              <em>More possibility.</em>
            </h2>
            <p>
              A future where thoughtful software gives people more time for
              meaningful work, and intelligent systems remain understandable and
              accountable.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          number="01"
          label="Our values"
          title="Principles, put into practice."
          description="How we make decisions matters as much as what we make."
        />
        <div className="value-list">
          {values.map(([name, text], i) => (
            <Reveal key={name}>
              <article>
                <span className="number">0{i + 1}</span>
                <h3>{name}</h3>
                <p>{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="section container technology-panel">
        <span className="eyebrow">Our technology approach</span>
        <h2>
          Choose the right tools.
          <br />
          <em>Build for the long term.</em>
        </h2>
        <p>
          We start with your constraints, not a prescribed stack. Modern
          frameworks, typed APIs, testable systems, and clear documentation help
          keep products resilient. AI belongs where it adds value, with
          appropriate evaluation and human oversight.
        </p>
        <a className="text-link" href="/work">
          See how we work ↗
        </a>
      </section>
      <CTA />
    </>
  );
}
