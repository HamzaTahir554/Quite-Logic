"use client";
import { useState } from "react";
import Image from "next/image";
import { apiCall, useAdminList } from "./useAdminList";
import { ListControls, Pagination } from "./ListControls";
type Project = {
  _id: string;
  title: string;
  slug: string;
  logo: string;
  description: string;
  shortDescription: string;
  category: string;
  technologies: string[];
  projectUrl: string;
  featured: boolean;
  status: string;
  order: number;
};
export default function ProjectManager() {
  const list = useAdminList<Project>("projects");
  const [editing, setEditing] = useState<Project | "new" | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function mutate(project: Project, data?: object) {
    if (
      !data &&
      !window.confirm(`Delete ${project.title}? This cannot be undone.`)
    )
      return;
    setBusy(true);
    list.setError("");
    setMessage("");
    try {
      await apiCall(
        `/api/admin/projects/${project._id}`,
        data ? "PATCH" : "DELETE",
        data,
      );
      list.refresh();
      setMessage(data ? "Project updated." : "Project deleted.");
    } catch (error) {
      list.setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function move(project: Project, direction: "earlier" | "later") {
    setBusy(true);
    list.setError("");
    setMessage("");
    try {
      await apiCall("/api/admin/projects/reorder", "POST", {
        id: project._id,
        direction,
      });
      list.refresh();
      setMessage("Project order updated.");
    } catch (error) {
      list.setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button primary" onClick={() => setEditing("new")}>
        Add project
      </button>
      {editing && (
        <ProjectEditor
          key={editing === "new" ? "new" : editing._id}
          project={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            list.refresh();
            setMessage("Project saved.");
          }}
        />
      )}
      <ListControls {...list} statuses={["draft", "published"]} />
      {list.error && (
        <p role="alert" className="admin-error">
          {list.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <p className="small muted">
        Lower display order appears first. Edit the order to move projects
        across pages.
      </p>
      {list.loading ? (
        <p role="status">Loading projects…</p>
      ) : (
        <div className="admin-list">
          {list.items.map((project) => (
            <article key={project._id} className="glass-panel admin-record">
              <div className="admin-record-heading">
                <h2>{project.title}</h2>
                <span className="admin-badge" data-status={project.status}>
                  {project.status}
                </span>
              </div>
              <p>
                {project.category || "Uncategorized"} · Display order:{" "}
                {project.order}
              </p>
              <p>
                {project.shortDescription || project.description.slice(0, 200)}
              </p>
              <div className="admin-actions">
                <button disabled={busy} onClick={() => setEditing(project)}>
                  Edit
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    mutate(project, {
                      status:
                        project.status === "published" ? "draft" : "published",
                    })
                  }
                >
                  {project.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => move(project, "earlier")}
                >
                  Move earlier
                </button>
                <button disabled={busy} onClick={() => move(project, "later")}>
                  Move later
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => mutate(project)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!list.items.length && <p>No projects match your filters.</p>}
        </div>
      )}
      <Pagination {...list} />
    </>
  );
}
function ProjectEditor({
  project,
  close,
  saved,
}: {
  project?: Project;
  close: () => void;
  saved: () => void;
}) {
  const [logo, setLogo] = useState(project?.logo || ""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const [slug, setSlug] = useState(project?.slug || ""),
    [slugEdited, setSlugEdited] = useState(!!project);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be at most 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setLogo(result.logo);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input = {
      title: form.get("title"),
      slug,
      logo,
      description: form.get("description"),
      shortDescription: form.get("shortDescription"),
      category: form.get("category"),
      technologies: String(form.get("technologies"))
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      projectUrl: form.get("projectUrl"),
      status: form.get("status"),
      order: Number(form.get("order")),
      featured: form.get("featured") === "on",
    };
    try {
      await apiCall(
        project ? `/api/admin/projects/${project._id}` : "/api/admin/projects",
        project ? "PATCH" : "POST",
        input,
      );
      saved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="glass-panel admin-editor"
      aria-labelledby="editor-title"
    >
      <h2 id="editor-title">{project ? "Edit project" : "Add project"}</h2>
      <form className="admin-form" onSubmit={save}>
        <label>
          Project title
          <input
            name="title"
            required
            minLength={2}
            maxLength={160}
            defaultValue={project?.title}
            onChange={(event) => {
              if (!slugEdited)
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
            }}
          />
        </label>
        <label>
          Slug
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={2}
            maxLength={180}
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
          />
        </label>
        <label>
          Project logo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading || busy}
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </label>
        <p className="small muted">
          PNG, JPEG or WebP, up to 2 MB and 16 megapixels.
        </p>
        {uploading && <p role="status">Uploading logo…</p>}
        {logo && (
          <Image
            unoptimized
            src={logo}
            alt="Project logo preview"
            width={160}
            height={100}
            className="admin-logo-preview"
          />
        )}
        <label>
          Project description
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={10000}
            rows={6}
            defaultValue={project?.description}
          />
        </label>
        <label>
          Short description
          <input
            name="shortDescription"
            maxLength={300}
            defaultValue={project?.shortDescription}
          />
        </label>
        <div className="admin-form-grid">
          <label>
            Category
            <input
              name="category"
              maxLength={100}
              defaultValue={project?.category}
            />
          </label>
          <label>
            Technologies (comma separated)
            <input
              name="technologies"
              defaultValue={project?.technologies.join(", ")}
            />
          </label>
          <label>
            Project URL
            <input
              name="projectUrl"
              maxLength={2000}
              defaultValue={project?.projectUrl}
              placeholder="https://example.com or /portfolio/slug"
            />
          </label>
          <label>
            Display order
            <input
              type="number"
              name="order"
              min={0}
              max={1000000}
              required
              defaultValue={project?.order || 0}
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={project?.status || "draft"}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={project?.featured}
          />
          Featured project
        </label>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <div className="admin-actions">
          <button
            className="button primary"
            disabled={busy || uploading || !logo}
          >
            {busy ? "Saving…" : "Save project"}
          </button>
          <button type="button" disabled={busy || uploading} onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
