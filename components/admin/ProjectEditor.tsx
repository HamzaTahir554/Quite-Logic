"use client";
import { useRef, useState } from "react";
import { projectSchema } from "@/lib/admin-validation";
import ProjectLogo from "@/components/projects/ProjectLogo";
import ProjectPreview from "./ProjectPreview";
import { AdminRequestError, apiCall } from "./useAdminList";
import { useAdminFeedback, useUnsavedChanges } from "./AdminFeedback";
import type { ManagedProject } from "./project-types";
import { StatusBadge } from "./AdminElements";

export default function ProjectEditor({
  project,
  close,
  saved,
}: {
  project?: ManagedProject;
  close: () => void;
  saved: () => void;
}) {
  const initial = {
    title: project?.title || "",
    slug: project?.slug || "",
    logo: project?.logo || "",
    description: project?.description || "",
    shortDescription: project?.shortDescription || "",
    category: project?.category || "",
    technologies: project?.technologies.join(", ") || "",
    projectUrl: project?.projectUrl || "",
    order: project?.order || 0,
    featured: project?.featured || false,
    status: project?.status || "draft",
  };
  const [values, setValues] = useState(initial),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [preview, setPreview] = useState(false),
    [slugEdited, setSlugEdited] = useState(!!project);
  const inFlight = useRef(false),
    formRef = useRef<HTMLFormElement>(null);
  const { confirm, notify, markDirty } = useAdminFeedback();
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || uploading;
  useUnsavedChanges(dirty);
  function update<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setError("");
  }
  async function cancel() {
    if (busy || uploading) return;
    if (
      dirty &&
      !(await confirm({
        title: "Discard your changes?",
        description:
          "Your changes haven’t been saved. You can keep editing or discard them.",
        action: "Discard changes",
        danger: true,
      }))
    )
      return;
    markDirty(false);
    close();
  }
  async function upload(file?: File) {
    if (!file || inFlight.current) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrors((current) => ({
        ...current,
        logo: "Choose a PNG, JPEG, or WebP image.",
      }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        logo: "Choose an image smaller than 2 MB.",
      }));
      return;
    }
    inFlight.current = true;
    setUploading(true);
    setError("");
    setErrors((current) => ({ ...current, logo: "" }));
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: data,
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Your logo couldn’t be uploaded. Please try again.",
        );
      update("logo", result.logo);
      notify("Logo uploaded. Save the project to keep your changes.");
    } catch (error) {
      const message =
        error instanceof TypeError ||
        (error instanceof Error && error.name === "TimeoutError")
          ? "The upload couldn’t finish. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Upload failed. Please try again.";
      setErrors((current) => ({ ...current, logo: message }));
      notify(message, "error");
    } finally {
      inFlight.current = false;
      setUploading(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const button = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const status = button?.value === "published" ? "published" : "draft";
    const parsed = projectSchema.safeParse({
      ...values,
      technologies: values.technologies
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      status,
    });
    if (!parsed.success) {
      const friendly: Record<string, string> = {
        title: "Enter a project title between 2 and 160 characters.",
        slug: "Use a unique page address with lowercase letters, numbers, and hyphens.",
        logo: "Upload a project logo before saving.",
        description: "Write a description between 10 and 10,000 characters.",
        projectUrl: "Use a full https:// URL or a local page path.",
        technologies: "Use up to 30 technologies, with 60 characters each.",
        order: "Enter a whole number from 0 to 1,000,000.",
      };
      const next = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          friendly[String(issue.path[0])] || issue.message,
        ]),
      );
      setErrors(next);
      setError("Please check the highlighted fields.");
      requestAnimationFrame(() => {
        const field = formRef.current?.elements.namedItem(
          String(parsed.error.issues[0].path[0]),
        );
        if (field instanceof HTMLElement) field.focus();
      });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setErrors({});
    try {
      await apiCall(
        project ? `/api/admin/projects/${project._id}` : "/api/admin/projects",
        project ? "PATCH" : "POST",
        parsed.data,
      );
      markDirty(false);
      notify(
        status === "published"
          ? "Project published."
          : "Project saved as draft.",
      );
      saved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Project couldn’t be saved. Please try again.";
      setError(message);
      if (error instanceof AdminRequestError) setErrors(error.fields);
      notify(message, "error");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function field(name: string) {
    return {
      id: `project-${name}`,
      name,
      "aria-invalid": !!errors[name],
      "aria-describedby": errors[name] ? `project-${name}-error` : undefined,
    };
  }
  function message(name: string) {
    return (
      errors[name] && (
        <span className="admin-field-error" id={`project-${name}-error`}>
          {errors[name]}
        </span>
      )
    );
  }
  const previewData = {
    ...values,
    technologies: values.technologies
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
  return (
    <section
      className="admin-panel admin-editor"
      aria-labelledby="editor-title"
    >
      <div className="admin-record-heading">
        <div>
          <span className="admin-eyebrow">
            {project ? "REFINE YOUR WORK" : "SOMETHING NEW"}
          </span>
          <h2 id="editor-title">{project ? "Edit project" : "Add project"}</h2>
          <p className="muted small">
            Fields marked <span aria-hidden="true">*</span> are required. You
            can preview before publishing.
          </p>
        </div>
        <span className="admin-editor-state">
          {dirty ? "Unsaved changes" : "Ready to edit"}
        </span>
      </div>
      <form
        ref={formRef}
        className="admin-form"
        onSubmit={save}
        noValidate
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.nativeEvent.isComposing &&
            event.target instanceof HTMLInputElement &&
            !["file", "checkbox"].includes(event.target.type)
          ) {
            event.preventDefault();
            formRef.current
              ?.querySelector<HTMLButtonElement>(
                `button[type="submit"][value="${project?.status === "published" ? "published" : "draft"}"]`,
              )
              ?.click();
          }
        }}
      >
        <fieldset disabled={busy || uploading} className="admin-fields">
          <label htmlFor="project-title">
            Project title{" "}
            <span className="admin-required" aria-hidden="true">
              *
            </span>
            <input
              {...field("title")}
              required
              maxLength={160}
              placeholder="e.g. Atlas / Cloud"
              value={values.title}
              onChange={(event) => {
                update("title", event.target.value);
                if (!slugEdited)
                  update(
                    "slug",
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                      .slice(0, 160) || "project",
                  );
              }}
            />
            {message("title")}
          </label>
          <div className="admin-logo-upload">
            <div>
              <label htmlFor="project-logo">
                Project logo{" "}
                <span className="admin-required" aria-hidden="true">
                  *
                </span>
                <input
                  {...field("logo")}
                  type="file"
                  required={!values.logo}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => upload(event.target.files?.[0])}
                />
              </label>
              <p className="small muted">
                PNG, JPEG, or WebP · Up to 2 MB · Maximum 16 megapixels
              </p>
              {message("logo")}
              {uploading && <p role="status">Uploading your logo…</p>}
            </div>
            <div className="admin-upload-preview">
              <ProjectLogo
                src={values.logo || null}
                title={values.title || "Project"}
                alt="Project logo preview"
                width={160}
                height={100}
              />
            </div>
          </div>
          <label htmlFor="project-description">
            Project description{" "}
            <span className="admin-required" aria-hidden="true">
              *
            </span>
            <textarea
              {...field("description")}
              required
              maxLength={10000}
              rows={6}
              placeholder="What does this project do, and who is it for?"
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
            />
            {message("description")}
            <small className="admin-character-count">
              {values.description.length.toLocaleString("en-US")} / 10,000
              characters
            </small>
          </label>
          <div className="admin-form-grid">
            <label htmlFor="project-category">
              Category
              <input
                {...field("category")}
                maxLength={100}
                list="project-categories"
                placeholder="e.g. Web"
                value={values.category}
                onChange={(event) => update("category", event.target.value)}
              />
              {message("category")}
            </label>
            <datalist id="project-categories">
              {["Web", "Mobile", "AI", "Automation", "Computer Vision"].map(
                (name) => (
                  <option value={name} key={name} />
                ),
              )}
            </datalist>
            <label htmlFor="project-technologies">
              Technologies
              <input
                {...field("technologies")}
                maxLength={1850}
                placeholder="e.g. Next.js, MongoDB, React"
                value={values.technologies}
                onChange={(event) => update("technologies", event.target.value)}
              />
              {message("technologies")}
              <small className="muted">
                Separate each technology with a comma.
              </small>
            </label>
            <label htmlFor="project-projectUrl">
              Project URL
              <input
                {...field("projectUrl")}
                maxLength={2000}
                inputMode="url"
                placeholder="https://your-project.com"
                value={values.projectUrl}
                onChange={(event) => update("projectUrl", event.target.value)}
              />
              {message("projectUrl")}
              <small className="muted">
                Optional. Your project detail page is created automatically.
              </small>
            </label>
            <label htmlFor="project-order">
              Display order
              <input
                {...field("order")}
                type="number"
                min={0}
                max={1000000}
                step={1}
                value={values.order}
                onChange={(event) =>
                  update(
                    "order",
                    event.target.value === "" ? 0 : Number(event.target.value),
                  )
                }
              />
              {message("order")}
              <small className="muted">Lower numbers appear first.</small>
            </label>
          </div>
          <details
            className="admin-optional-fields"
            open={errors.slug ? true : undefined}
          >
            <summary>Page address and optional details</summary>
            <div className="admin-fields">
              <label htmlFor="project-slug">
                Page address
                <input
                  {...field("slug")}
                  maxLength={180}
                  value={values.slug}
                  placeholder="atlas-cloud"
                  onChange={(event) => {
                    setSlugEdited(true);
                    update("slug", event.target.value);
                  }}
                />
                {message("slug")}
                <small className="muted">
                  Automatically created from your title: /portfolio/
                  {values.slug || "your-project"}
                </small>
              </label>
              <label htmlFor="project-shortDescription">
                Short description
                <input
                  {...field("shortDescription")}
                  maxLength={300}
                  placeholder="A short introduction for the project page."
                  value={values.shortDescription}
                  onChange={(event) =>
                    update("shortDescription", event.target.value)
                  }
                />
                {message("shortDescription")}
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  name="featured"
                  checked={values.featured}
                  onChange={(event) => update("featured", event.target.checked)}
                />
                Featured project
              </label>
            </div>
          </details>
        </fieldset>
        {error && (
          <p role="alert" className="admin-error-panel">
            {error} Your entered information is still here.
          </p>
        )}
        <div className="admin-editor-footer">
          <div>
            <span className="small muted">Current status</span>{" "}
            <StatusBadge status={project?.status || "draft"} />
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              disabled={busy || uploading}
              onClick={cancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy || uploading}
              onClick={() => setPreview(true)}
            >
              Preview
            </button>
            <button
              className="admin-button"
              type="submit"
              value="draft"
              disabled={busy || uploading}
            >
              {busy
                ? "Saving…"
                : project?.status === "published"
                  ? "Save as Draft"
                  : "Save Draft"}
            </button>
            <button
              className="admin-button is-primary"
              type="submit"
              value="published"
              disabled={busy || uploading}
            >
              {busy ? "Saving…" : "Publish Project"}
            </button>
          </div>
        </div>
      </form>
      {preview && (
        <ProjectPreview project={previewData} close={() => setPreview(false)} />
      )}
    </section>
  );
}
