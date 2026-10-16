import { projects } from "@/data/content";
import { SectionHeading } from "@/components/ui/Elements";
import Reveal from "@/components/ui/Reveal";
import ProjectCard from "@/components/ui/ProjectCard";
import Link from "next/link";
export default function SelectedWork() {
  return (
    <section className="section container">
      <SectionHeading
        number="02"
        label="Selected concepts"
        title="Focused design."
        accent="Smart functionality."
        description="Explorations of what thoughtful software can look like. Illustrative concepts, ready for a real conversation."
      />
      <div className="project-list">
        {projects.map((p, index) => (
          <Reveal key={p.id} delay={index * 0.08}>
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </div>
      <div className="section-end">
        <span className="small muted">Ideas made tangible.</span>
        <Link className="text-link" href="/portfolio">
          View Our Work ↗
        </Link>
      </div>
    </section>
  );
}
