"use client";
import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import PortfolioCard from "@/components/projects/PortfolioCard";
import ProjectLogo from "@/components/projects/ProjectLogo";
import { StatusBadge } from "./AdminElements";
import type { ProjectPreviewData } from "./project-types";
import { useMotionPreference } from "@/hooks/useMotionPreference";

export default function ProjectPreview({
  project,
  close,
}: {
  project: ProjectPreviewData;
  close: () => void;
}) {
  const [mode, setMode] = useState("card");
  const reduced = useMotionPreference();
  return (
    <Dialog
      open
      onClose={close}
      fullWidth
      maxWidth="md"
      transitionDuration={reduced ? 0 : 180}
      aria-labelledby="project-preview-title"
      slotProps={{ paper: { className: "admin-dialog admin-preview-dialog" } }}
    >
      <DialogTitle id="project-preview-title">Project preview</DialogTitle>
      <DialogContent>
        <p className="admin-preview-note">
          This is a private preview. Your changes appear publicly only after you
          publish.
        </p>
        <div
          className="admin-preview-tabs"
          role="tablist"
          aria-label="Preview format"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "card"
                : event.key === "End"
                  ? "page"
                  : mode === "card"
                    ? "page"
                    : "card";
            setMode(next);
            requestAnimationFrame(() =>
              document.getElementById(`preview-${next}-tab`)?.focus(),
            );
          }}
        >
          <button
            role="tab"
            id="preview-card-tab"
            aria-controls="preview-card-panel"
            aria-selected={mode === "card"}
            tabIndex={mode === "card" ? 0 : -1}
            className="admin-button"
            onClick={() => setMode("card")}
          >
            Project card
          </button>
          <button
            role="tab"
            id="preview-page-tab"
            aria-controls="preview-page-panel"
            aria-selected={mode === "page"}
            tabIndex={mode === "page" ? 0 : -1}
            className="admin-button"
            onClick={() => setMode("page")}
          >
            Project details
          </button>
        </div>
        {mode === "card" ? (
          <div
            role="tabpanel"
            id="preview-card-panel"
            aria-labelledby="preview-card-tab"
            className="admin-card-preview"
          >
            <PortfolioCard
              project={{
                id: "admin-preview",
                title: project.title || "Your project title",
                image_url: project.logo || null,
                description:
                  project.description ||
                  "Your project description will appear here.",
                category: project.category,
                source_slug: null,
                project_url: "",
              }}
              onOpen={() => setMode("page")}
            />
            <p className="small muted">
              Hover, focus, or tap the card to reveal its description.
            </p>
          </div>
        ) : (
          <div
            role="tabpanel"
            id="preview-page-panel"
            aria-labelledby="preview-page-tab"
            className="admin-detail-preview"
          >
            <StatusBadge status={project.status} />
            <ProjectLogo
              src={project.logo || null}
              title={project.title || "Your project"}
              width={320}
              height={160}
            />
            <span className="admin-eyebrow">
              {project.category || "PROJECT"}
            </span>
            <h2>{project.title || "Your project title"}</h2>
            <p className="admin-preview-description">
              {project.description ||
                "Your project description will appear here."}
            </p>
            {project.technologies.length > 0 && (
              <div className="admin-technology-tags">
                {project.technologies.map((tech) => (
                  <span key={tech}>{tech}</span>
                ))}
              </div>
            )}
            <button className="admin-text-link" onClick={() => setMode("card")}>
              ← Back to card preview
            </button>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <button autoFocus className="admin-button" onClick={close}>
          Close preview
        </button>
      </DialogActions>
    </Dialog>
  );
}
