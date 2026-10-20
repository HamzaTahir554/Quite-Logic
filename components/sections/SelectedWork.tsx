import Arrow from "@/components/ui/Arrow";
import { getHomeProjects } from "@/lib/public-data";
import { SectionHeading } from "@/components/ui/Elements";
import Reveal from "@/components/ui/Reveal";
import ProjectCard from "@/components/ui/ProjectCard";
import Link from "next/link";
export default async function SelectedWork() {
  const projects = await getHomeProjects();
  if (!projects.length) return null;
  return (
    <section
      className="section container home-projects"
      aria-label="Selected projects"
    >
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
          View Our Work <Arrow />
        </Link>
      </div>
    </section>
  );
}
