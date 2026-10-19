"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import ProjectLogo from "@/components/projects/ProjectLogo";
import { apiCall, useAdminList } from "./useAdminList";
import { ListControls, Pagination } from "./ListControls";
import {
  EmptyState,
  ListError,
  ListSkeleton,
  StatusBadge,
} from "./AdminElements";
import { useAdminAction, useAdminFeedback } from "./AdminFeedback";
import AdminIcon from "./AdminIcon";
import ProjectEditor from "./ProjectEditor";
import ProjectPreview from "./ProjectPreview";
import { adminDate, type ManagedProject } from "./project-types";

export default function ProjectManager() {
  const params = useSearchParams(),
    list = useAdminList<ManagedProject>("projects");
  const [editing, setEditing] = useState<ManagedProject | "new" | null>(
      params.get("action") === "new" ? "new" : null,
    ),
    [preview, setPreview] = useState<ManagedProject | null>(null);
  const action = useAdminAction(),
    { confirm, hasUnsavedChanges, markDirty } = useAdminFeedback();
  const disabled = action.busy || list.loading || editing !== null;
  async function edit(project: ManagedProject | "new") {
    if (
      hasUnsavedChanges() &&
      !(await confirm({
        title: "Discard your changes?",
        description:
          "Your current project has unsaved changes. Keep editing or discard them to open another project.",
        action: "Discard changes",
        danger: true,
      }))
    )
      return;
    markDirty(false);
    setEditing(project);
    requestAnimationFrame(() =>
      document
        .getElementById("editor-title")
        ?.scrollIntoView({ block: "start" }),
    );
  }
  async function mutate(project: ManagedProject, status?: string) {
    if (disabled) return;
    if (
      !status &&
      !(await confirm({
        title: "Delete this project?",
        description: `“${project.title}” will be permanently removed from your portfolio. This can’t be undone.`,
        action: "Delete project",
        danger: true,
      }))
    )
      return;
    const success =
      status === "published"
        ? "Project published."
        : status === "draft"
          ? "Project unpublished. It’s now a private draft."
          : "Project deleted.";
    if (
      await action.run(
        () =>
          apiCall(
            `/api/admin/projects/${project._id}`,
            status ? "PATCH" : "DELETE",
            status ? { status } : undefined,
          ),
        success,
      )
    )
      list.refresh();
  }
  async function move(project: ManagedProject, direction: "earlier" | "later") {
    if (disabled) return;
    if (
      await action.run(
        () =>
          apiCall("/api/admin/projects/reorder", "POST", {
            id: project._id,
            direction,
          }),
        "Project order updated.",
      )
    )
      list.refresh();
  }
  async function toggleHome(project: ManagedProject) {
    if (disabled) return;
    if (
      await action.run(
        () =>
          apiCall(`/api/admin/projects/${project._id}`, "PATCH", {
            showOnHome: !project.showOnHome,
          }),
        project.showOnHome
          ? "Project removed from Home."
          : "Project selected for Home. The first three published selections are displayed.",
      )
    )
      list.refresh();
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            YOUR WORK, THOUGHTFULLY PRESENTED
          </span>
          <h1>Portfolio</h1>
          <p className="muted">
            Create a draft, preview your work, and publish when you’re ready.
          </p>
        </div>
        <button
          className="admin-button is-primary"
          disabled={action.busy}
          onClick={() => edit("new")}
        >
          <AdminIcon name="Plus" />
          Add project
        </button>
      </div>
      {editing && (
        <ProjectEditor
          key={editing === "new" ? "new" : editing._id}
          project={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            list.refresh();
          }}
        />
      )}
      <div className="admin-panel admin-list-panel">
        <ListControls
          {...list}
          noun="projects"
          statuses={["draft", "published"]}
          disabled={action.busy}
        />
        <div className="admin-list-summary">
          <span>
            {list.total} {list.total === 1 ? "project" : "projects"}
          </span>
          <span className="small muted">
            {list.loading && list.items.length
              ? "Updating your projects…"
              : list.sort !== "order"
                ? "Choose Display order to reorder projects."
                : "Use the arrows or edit Display order to move projects."}
          </span>
        </div>
        {list.error && <ListError message={list.error} retry={list.refresh} />}
        {action.error && (
          <p className="admin-error-panel" role="alert">
            {action.error}
          </p>
        )}
        {list.loading && list.items.length === 0 ? (
          <ListSkeleton />
        ) : (
          <div className="admin-list" aria-busy={list.loading}>
            {list.items.map((project, index) => (
              <article
                key={project._id}
                className="admin-record admin-project-record"
              >
                <div className="admin-record-logo">
                  <ProjectLogo
                    src={project.logo}
                    title={project.title}
                    width={80}
                    height={64}
                  />
                </div>
                <div className="admin-project-info">
                  <h2>{project.title}</h2>
                  <p>{project.category || "No category"}</p>
                  <small className="muted">
                    Updated {adminDate(project.updatedAt)} · Order{" "}
                    {project.order}
                  </small>
                  <p className="small muted">
                    Home Page: {project.homeVisible ? "Visible" : "Hidden"}
                    {project.showOnHome && !project.homeVisible
                      ? project.status === "draft"
                        ? " · Draft"
                        : " · After first three selections"
                      : ""}
                  </p>
                </div>
                <StatusBadge status={project.status} />
                <div className="admin-actions admin-project-actions">
                  <button
                    className="admin-button"
                    disabled={disabled}
                    aria-pressed={!!project.showOnHome}
                    aria-label={`Show ${project.title} on Home Page`}
                    onClick={() => toggleHome(project)}
                  >
                    Home {project.showOnHome ? "ON" : "OFF"}
                  </button>
                  <button
                    className="admin-button"
                    disabled={disabled}
                    onClick={() => edit(project)}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-button"
                    disabled={disabled}
                    onClick={() => setPreview(project)}
                  >
                    Preview
                  </button>
                  <button
                    className="admin-button"
                    disabled={disabled}
                    onClick={() =>
                      mutate(
                        project,
                        project.status === "published" ? "draft" : "published",
                      )
                    }
                  >
                    {project.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    className="admin-button is-danger-subtle"
                    disabled={disabled}
                    onClick={() => mutate(project)}
                  >
                    Delete
                  </button>
                  <div className="admin-reorder-buttons">
                    <button
                      className="admin-icon-button"
                      aria-label={`Move ${project.title} earlier`}
                      title="Move earlier"
                      disabled={
                        disabled ||
                        list.sort !== "order" ||
                        (index === 0 &&
                          list.page === 1 &&
                          !list.status &&
                          !list.search)
                      }
                      onClick={() => move(project, "earlier")}
                    >
                      ↑
                    </button>
                    <button
                      className="admin-icon-button"
                      aria-label={`Move ${project.title} later`}
                      title="Move later"
                      disabled={
                        disabled ||
                        list.sort !== "order" ||
                        (index === list.items.length - 1 &&
                          list.page * 12 >= list.total &&
                          !list.status &&
                          !list.search)
                      }
                      onClick={() => move(project, "later")}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!list.loading && !list.items.length && !list.error && (
              <EmptyState
                title={
                  list.search || list.status
                    ? "No projects found."
                    : "Your next project starts here."
                }
                description={
                  list.search || list.status
                    ? "Try a different search or clear the filters to see all projects."
                    : "Add your first project, save a draft, and preview it before publishing."
                }
              >
                {list.search || list.status ? (
                  <button
                    className="admin-button"
                    onClick={() => {
                      list.setSearch("");
                      list.setStatus("");
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    className="admin-button is-primary"
                    onClick={() => edit("new")}
                  >
                    Add your first project
                  </button>
                )}
              </EmptyState>
            )}
          </div>
        )}
        <Pagination {...list} loading={list.loading || action.busy} />
      </div>
      {preview && (
        <ProjectPreview project={preview} close={() => setPreview(null)} />
      )}
    </>
  );
}
