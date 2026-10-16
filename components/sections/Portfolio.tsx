"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { projects } from "@/data/content";
import ProjectCard from "@/components/ui/ProjectCard";
import Reveal from "@/components/ui/Reveal";
const filters = ["All", "Web", "Mobile", "AI", "Automation", "Computer Vision"];
export default function Portfolio() {
  const [filter, setFilter] = useState("All");
  const reduced = useReducedMotion();
  const selected = projects.filter(
    (p) =>
      filter === "All" || (p.categories as readonly string[]).includes(filter),
  );
  return (
    <section className="container portfolio-section">
      <div
        className="portfolio-filters"
        role="group"
        aria-label="Filter projects"
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={f === filter}
            className={f === filter ? "selected" : ""}
          >
            {f}
          </button>
        ))}
      </div>
      <p className="small muted portfolio-count" aria-live="polite">
        {selected.length} illustrative{" "}
        {selected.length === 1 ? "concept" : "concepts"} · These are design
        explorations, not client case studies.
      </p>
      <motion.div layout={!reduced} className="project-list">
        <AnimatePresence mode="popLayout">
          {selected.map((p, index) => (
            <motion.div
              layout={!reduced}
              key={p.id}
              initial={{
                opacity: 0,
                scale: 0.96,
                clipPath: "inset(0 0 12% 0 round 28px)",
              }}
              animate={{
                opacity: 1,
                scale: 1,
                clipPath: "inset(0 0 0% 0 round 28px)",
              }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{
                duration: reduced ? 0 : 0.3,
                ease: [0.2, 0.7, 0.2, 1],
              }}
            >
              <Reveal delay={index * 0.07}>
                <ProjectCard project={p} />
              </Reveal>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {selected.length === 0 && (
        <div className="portfolio-empty" role="status">
          <h2>More possibilities ahead.</h2>
          <p>There are no published concepts in this discipline yet.</p>
          <button className="button secondary" onClick={() => setFilter("All")}>
            Explore all concepts <span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
    </section>
  );
}
