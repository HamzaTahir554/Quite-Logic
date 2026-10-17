"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PortfolioProject } from "@/lib/portfolio";
import ProjectLogo from "./ProjectLogo";

export default function PortfolioCard({
  project,
  onOpen,
}: {
  project: PortfolioProject;
  onOpen?: () => void;
}) {
  const [expanded, setExpanded] = useState(false),
    [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const pointer = useRef("mouse"),
    router = useRouter();
  const open = expanded || hovered || focused;
  const destination = /^(https?:\/\/|\/(?![\/\\]))/.test(project.project_url)
    ? project.project_url
    : "";
  const canOpen = !!destination || !!onOpen;
  function navigate() {
    if (onOpen) return onOpen();
    if (!destination) return setExpanded(true);
    if (destination.startsWith("/")) router.push(destination);
    else location.assign(destination);
  }
  return (
    <article
      className="managed-project-card glass-panel"
      data-open={open}
      onClick={(event) => {
        // The full mouse target complements the real keyboard/touch controls.
        if (
          !canOpen ||
          event.defaultPrevented ||
          event.detail === 0 ||
          pointer.current === "touch" ||
          matchMedia("(hover: none)").matches ||
          window.getSelection()?.toString()
        )
          return;
        if (event.target instanceof Element && event.target.closest("a,button"))
          return;
        navigate();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        pointer.current = event.pointerType;
      }}
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
        aria-label={`View details for ${project.title}`}
        aria-expanded={open}
        aria-controls={`project-description-${project.id}`}
        data-cursor="VIEW"
        onClick={(event) => {
          if (
            event.detail > 0 &&
            (pointer.current === "touch" || matchMedia("(hover: none)").matches)
          )
            setExpanded(true);
          else if (canOpen) navigate();
          else setExpanded((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}
      >
        <span className="managed-project-logo">
          <ProjectLogo src={project.image_url} title={project.title} />
        </span>
        <span role="heading" aria-level={2} className="managed-project-title">
          {project.title}
        </span>
        <span className="project-touch-hint">
          View details <span aria-hidden="true">↑</span>
        </span>
      </button>
      <div
        id={`project-description-${project.id}`}
        className="managed-project-description"
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className="project-description-copy"
          role="region"
          aria-label={`Description of ${project.title}`}
          tabIndex={open ? 0 : -1}
        >
          {project.source_slug && (
            <span className="project-concept-label">Illustrative concept</span>
          )}
          <p>{project.description}</p>
        </div>
        {canOpen &&
          (onOpen ? (
            <button
              type="button"
              className="text-link project-preview-link"
              onClick={onOpen}
            >
              View Project <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <Link href={destination} className="text-link" data-cursor="OPEN">
              View Project <span aria-hidden="true">↗</span>
            </Link>
          ))}
      </div>
    </article>
  );
}
