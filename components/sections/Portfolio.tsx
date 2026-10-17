"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/ui/Reveal";
import type { PortfolioProject } from "@/lib/portfolio";
import { projects as originalConcepts } from "@/data/content";
const baseFilters = [
  "All",
  "Web",
  "Mobile",
  "AI",
  "Automation",
  "Computer Vision",
];
export default function Portfolio({
  projects,
  total = projects.length,
  unavailable = false,
}: {
  projects: PortfolioProject[];
  total?: number;
  unavailable?: boolean;
}) {
  const [filter, setFilter] = useState("All");
  const [additional, setAdditional] = useState<PortfolioProject[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const allProjects = [...projects, ...additional];
  async function loadMore() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/projects?page=${Math.floor(allProjects.length / 24) + 1}&limit=24`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error("Projects could not be loaded. Please try again.");
      setAdditional((previous) => [...previous, ...data.projects]);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const categories = (project: PortfolioProject) => {
    const original = originalConcepts.find(
      (concept) => concept.slug === project.source_slug,
    );
    if (original && project.category === original.category)
      return [...original.categories];
    return project.category
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  };
  const filters = [
    ...new Set([...baseFilters, ...allProjects.flatMap(categories)]),
  ];
  const selected = allProjects.filter(
    (project) => filter === "All" || categories(project).includes(filter),
  );
  return (
    <section className="container portfolio-section">
      <div
        className="portfolio-filters"
        role="group"
        aria-label="Filter projects"
      >
        {filters.map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={filter === value ? "selected" : ""}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="small muted portfolio-count" aria-live="polite">
        {selected.length} published{" "}
        {selected.length === 1 ? "project" : "projects"}. Projects marked
        “Concept” are illustrative explorations.
      </p>
      <div className="managed-project-grid">
        {selected.map((project) => (
          <Reveal key={project.id}>
            <PortfolioCard project={project} />
          </Reveal>
        ))}
      </div>
      {allProjects.length < total && (
        <p>
          <button
            className="button secondary"
            disabled={loading}
            onClick={loadMore}
          >
            {loading ? "Loading…" : "Load more projects"}
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!selected.length && (
        <div className="portfolio-empty" role="status">
          <h2>More possibilities ahead.</h2>
          <p>
            {unavailable
              ? "Projects are temporarily unavailable. Please check back soon."
              : "There are no projects in this discipline yet."}
          </p>
          {filter !== "All" && (
            <button
              className="button secondary"
              onClick={() => setFilter("All")}
            >
              Explore all projects ↗
            </button>
          )}
        </div>
      )}
    </section>
  );
}
function PortfolioCard({ project }: { project: PortfolioProject }) {
  const [expanded, setExpanded] = useState(false),
    [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const open = expanded || hovered || focused;
  function select() {
    setExpanded((value) => !value);
  }
  return (
    <article
      className="managed-project-card glass-panel"
      data-open={open}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setExpanded(false);
          setFocused(false);
          setHovered(false);
        }
      }}
    >
      <button
        className="project-identity-button"
        aria-label={`Show details for ${project.title}`}
        aria-expanded={open}
        aria-controls={`project-description-${project.id}`}
        onClick={select}
        data-cursor="VIEW"
      >
        <span className="managed-project-logo">
          {project.image_url ? (
            <Image
              unoptimized
              src={project.image_url}
              alt={`${project.title} logo`}
              width={240}
              height={160}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span aria-hidden="true">{project.title.slice(0, 1)}</span>
          )}
        </span>
        <span role="heading" aria-level={2} className="managed-project-title">
          {project.title}
        </span>
      </button>
      <div
        id={`project-description-${project.id}`}
        className="managed-project-description"
        aria-hidden={!open}
        inert={!open}
      >
        <p>{project.description}</p>
        {project.project_url && (
          <Link
            href={project.project_url}
            className="text-link"
            data-cursor="OPEN"
          >
            {project.source_slug ? "Explore concept" : "Open project"}
            <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
    </article>
  );
}
