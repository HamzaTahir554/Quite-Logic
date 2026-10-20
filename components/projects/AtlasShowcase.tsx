"use client";
import Arrow from "@/components/ui/Arrow";
import Link from "next/link";
import Chip from "@mui/material/Chip";
import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import type { Project } from "@/data/content";
import DeploymentTerminal from "./DeploymentTerminal";
import { useReducedMotion } from "framer-motion";
import { useCrystalPointer } from "@/hooks/useCrystalPointer";

export default function AtlasShowcase({
  project,
  primary = false,
}: {
  project: Project;
  primary?: boolean;
}) {
  const Heading = primary ? "h1" : "h3";
  const root = useRef<HTMLElement>(null);
  useCrystalPointer(
    root,
    primary ? ".atlas-copy > h1, .atlas-copy > p, .atlas-copy > .overline" : "",
  );
  const reduced = useReducedMotion();
  const entered = useRef(false);
  const animations = useRef<Animation[]>([]);
  useEffect(
    () => () => {
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
    },
    [reduced],
  );
  return (
    <motion.article
      ref={root}
      className={`atlas-showcase ${primary ? "atlas-primary container" : "project-card"}`}
      initial={false}
      onViewportEnter={(entry) => {
        if (!entry || reduced || entered.current || !primary) return;
        entered.current = true;
        animations.current.push(
          entry.target.animate(
            [
              { clipPath: "inset(3% 0 0 0 round 32px)", opacity: 0.45 },
              { clipPath: "inset(0 0 0 0 round 32px)", opacity: 1 },
            ],
            { duration: 450, easing: "cubic-bezier(.2,.7,.2,1)" },
          ),
        );
        entry.target
          .querySelectorAll(
            ".atlas-copy .overline,h1,.atlas-copy p,.atlas-tags,.atlas-visual",
          )
          .forEach((child, index) =>
            animations.current.push(
              child.animate(
                [
                  {
                    opacity: 0.2,
                    transform: "translateY(14px)",
                    clipPath: "inset(0 0 35% 0)",
                  },
                  {
                    opacity: 1,
                    transform: "translateY(0)",
                    clipPath: "inset(0 0 0% 0)",
                  },
                ],
                {
                  duration: 380,
                  delay: Math.min(index * 20, 80),
                  fill: "backwards",
                  easing: "cubic-bezier(.2,.7,.2,1)",
                },
              ),
            ),
          );
      }}
    >
      <span className="crystal-light" aria-hidden="true" />
      <span className="crystal-sheen" aria-hidden="true" />
      <div className="atlas-copy">
        <span className="overline">{project.type}</span>
        <Heading>
          {primary ? (
            project.title
          ) : (
            <Link href={`/portfolio/${project.slug}`}>{project.title}</Link>
          )}
        </Heading>
        <p>{project.description}</p>
        <div className="atlas-tags chips">
          {project.technologies.map((tag) => (
            <Chip key={tag} label={tag.toUpperCase()} size="small" />
          ))}
        </div>
        {!primary && (
          <Link
            className="text-link atlas-project-link"
            href={`/portfolio/${project.slug}`}
          >
            Explore concept <Arrow />
          </Link>
        )}
      </div>
      <div className="atlas-visual">
        <DeploymentTerminal
          href={primary ? undefined : `/portfolio/${project.slug}`}
        />
      </div>
    </motion.article>
  );
}
