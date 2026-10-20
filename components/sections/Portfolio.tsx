"use client";
import FabricButton from "@/components/ui/FabricButton";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PortfolioProject } from "@/lib/portfolio";
import PortfolioCard from "@/components/projects/PortfolioCard";
import PortfolioSkeleton from "@/components/projects/PortfolioSkeleton";
const baseFilters = [
  "All",
  "Web",
  "Mobile",
  "AI",
  "Automation",
  "Computer Vision",
];
type Page = { projects: PortfolioProject[]; total: number; page: number };
export default function Portfolio({
  projects,
  total = projects.length,
  categories = [],
  unavailable = false,
}: {
  projects: PortfolioProject[];
  total?: number;
  categories?: string[];
  unavailable?: boolean;
}) {
  const [filter, setFilter] = useState("All"),
    [data, setData] = useState<Page>({ projects, total, page: 1 }),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [interacted, setInteracted] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const cached = useRef(
    new Map<string, Page>([["All", { projects, total, page: 1 }]]),
  );
  const reduced = useReducedMotion();
  const featured = data.projects.find((project) => project.featured);
  const gridProjects = data.projects.filter((project) => project !== featured);
  useEffect(() => () => controller.current?.abort(), []);
  async function load(category: string, page = 1) {
    setInteracted(true);
    controller.current?.abort();
    if (page === 1 && cached.current.has(category)) {
      setFilter(category);
      setData(cached.current.get(category)!);
      setError("");
      setLoading(false);
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setFilter(category);
    setLoading(true);
    setError("");
    if (page === 1) setData({ projects: [], total: 0, page: 1 });
    try {
      const response = await fetch(
        `/api/projects?${new URLSearchParams({ category: category === "All" ? "" : category, page: String(page), limit: "24" })}`,
        { signal: request.signal },
      );
      const result = await response.json();
      if (!response.ok) throw new Error();
      if (request.signal.aborted) return;
      const previous =
        page > 1 ? cached.current.get(category)?.projects || [] : [];
      const unique = new Map(
        [...previous, ...result.projects].map((project: PortfolioProject) => [
          project.id,
          project,
        ]),
      );
      const next = {
        projects: [...unique.values()],
        total: result.total,
        page,
      };
      cached.current.set(category, next);
      setData(next);
    } catch {
      if (!request.signal.aborted)
        setError("Projects couldn’t be loaded. Please try again.");
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }
  return (
    <section className="container portfolio-section">
      <div
        className="portfolio-filters"
        role="group"
        aria-label="Filter projects"
      >
        {[...new Set([...baseFilters, ...categories])].map((value) => (
          <button
            key={value}
            onClick={() => {
              if (filter !== value) void load(value);
            }}
            aria-pressed={filter === value}
            className={filter === value ? "selected" : ""}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="small muted portfolio-count" aria-live="polite">
        {loading && data.projects.length === 0
          ? "Finding projects…"
          : `${data.total} ${data.total === 1 ? "Project" : "Projects"}${filter === "All" ? "" : ` · ${filter}`}`}
      </p>
      {loading && data.projects.length === 0 ? (
        <PortfolioSkeleton />
      ) : (
        <div className="portfolio-results" aria-busy={loading}>
          {featured && (
            <div className="portfolio-featured">
              <PortfolioCard project={featured} featured />
            </div>
          )}
          <div className="managed-project-grid">
            {gridProjects.map((project) => (
              <motion.div
                key={`${filter}-${project.id}`}
                initial={reduced || !interacted ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
              >
                <PortfolioCard project={project} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {error && (
        <div className="portfolio-empty" role="alert">
          <p>{error}</p>
          <FabricButton
            variant="secondary"
            className="portfolio-action"
            onClick={() =>
              load(filter, data.projects.length ? data.page + 1 : 1)
            }
          >
            Try again
          </FabricButton>
        </div>
      )}
      {!loading && !error && data.projects.length === 0 && (
        <div className="portfolio-empty" role="status">
          <h2>
            {filter === "All" && !unavailable
              ? "New projects are coming soon."
              : "More possibilities ahead."}
          </h2>
          <p>
            {unavailable
              ? "Projects are temporarily unavailable. Please check back soon."
              : filter === "All"
                ? "We’re preparing new work to share. Come back soon."
                : "There are no projects in this discipline yet."}
          </p>
          {filter !== "All" && (
            <FabricButton
              variant="secondary"
              className="portfolio-action"
              onClick={() => load("All")}
            >
              Explore all projects
            </FabricButton>
          )}
        </div>
      )}
      {data.projects.length < data.total && !error && (
        <p className="portfolio-load-more">
          <FabricButton
            variant="secondary"
            className="portfolio-action"
            disabled={loading}
            onClick={() => load(filter, data.page + 1)}
          >
            {loading ? "Loading projects…" : "Load more projects"}
          </FabricButton>
        </p>
      )}
    </section>
  );
}
