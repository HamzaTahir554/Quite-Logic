"use client";
import Link from "next/link";
import Chip from "@mui/material/Chip";
import type { HomeProject } from "@/lib/portfolio";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import type { PointerEvent } from "react";
import AtlasShowcase from "@/components/projects/AtlasShowcase";
import ProjectArtwork from "@/components/projects/ProjectArtwork";
import CrystalReflection from "@/components/motion/CrystalReflection";
export default function ProjectCard({ project }: { project: HomeProject }) {
  return project.slug === "atlas-cloud" ? (
    <AtlasShowcase project={project} />
  ) : (
    <StandardProjectCard project={project} />
  );
}
function StandardProjectCard({ project }: { project: HomeProject }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 160, damping: 23 });
  const rotateY = useSpring(y, { stiffness: 160, damping: 23 });
  function move(event: PointerEvent<HTMLElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(-((event.clientY - rect.top) / rect.height - 0.5) * 4);
    y.set(((event.clientX - rect.left) / rect.width - 0.5) * 5);
    event.currentTarget.style.setProperty(
      "--glow-x",
      `${event.clientX - rect.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--glow-y",
      `${event.clientY - rect.top}px`,
    );
  }
  return (
    <motion.article
      className="project-card"
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      onPointerMove={move}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={reduced ? {} : { scale: 1.015 }}
    >
      <CrystalReflection />
      <div className="project-copy">
        <span className="overline">{project.category}</span>
        <h3>
          <Link href={`/portfolio/${project.slug}`}>{project.title}</Link>
        </h3>
        <p>{project.description}</p>
        <div className="chips">
          {project.technologies.map((t) => (
            <Chip key={t} label={t} size="small" />
          ))}
        </div>
        <Link href={`/portfolio/${project.slug}`} className="text-link">
          Explore concept <span>↗</span>
        </Link>
      </div>
      <Link
        href={`/portfolio/${project.slug}`}
        className="project-visual home-project-visual"
        data-cursor="VIEW"
        aria-label={`Explore ${project.title}`}
      >
        <ProjectArtwork
          src={project.logo}
          logoTitle={project.title}
          alt={`${project.title} logo`}
        />
      </Link>
    </motion.article>
  );
}
