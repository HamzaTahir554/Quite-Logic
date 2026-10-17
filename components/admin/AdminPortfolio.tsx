"use client";
import { useEffect, useRef, useState } from "react";
import type { ManagedProject } from "@/lib/portfolio";
import { useRouter } from "next/navigation";
export default function AdminPortfolio() {
  const router = useRouter();
  const [items, setItems] = useState<ManagedProject[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [editing, setEditing] = useState<ManagedProject | "new" | null>(null),
    [deleting, setDeleting] = useState<string | null>(null),
    [search, setSearch] = useState("");
  const lock = useRef(false);
  const formSection = useRef<HTMLElement>(null);
  async function load() {
    const response = await fetch("/api/admin/portfolio");
    if (response.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setItems(data.items);
  }
  useEffect(() => {
    load()
      .catch(() => setError("Could not load projects. Please reload the page."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (editing) {
      formSection.current?.scrollIntoView({ block: "start" });
      formSection.current
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    }
  }, [editing]);
  async function action(payload: unknown) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await load();
      setMessage(data.message);
      router.refresh();
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update the portfolio.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const data = new FormData(event.currentTarget);
    let image: string | undefined;
    try {
      const file = data.get("image") as File;
      if (file?.size) {
        if (
          file.size > 2_000_000 ||
          !["image/png", "image/jpeg", "image/webp"].includes(file.type)
        )
          throw new Error("Choose a PNG, JPEG or WebP image up to 2 MB.");
        image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read image."));
          reader.readAsDataURL(file);
        });
      }
      const project = {
        title: data.get("title"),
        description: data.get("description"),
        category: data.get("category"),
        project_url: data.get("project_url"),
        published: data.get("published") === "on",
      };
      if (
        await action({
          action: "Save",
          id: editing !== "new" ? editing?.id : undefined,
          project,
          image,
        })
      )
        setEditing(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not read image.",
      );
    }
  }
  async function move(index: number, direction: number) {
    const ids = items.map((item) => item.id);
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    await action({ action: "Reorder", ids });
  }
  return (
    <div className="admin-portfolio">
      <div className="admin-toolbar">
        <label>
          Search projects
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title or category"
          />
        </label>
        <button className="ql-button primary" onClick={() => setEditing("new")}>
          Add project
        </button>
      </div>
      <p role="alert" className="ql-error">
        {error}
      </p>
      <p role="status" className="ql-success">
        {message}
      </p>
      {loading ? (
        <p>Loading projects…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status / order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items
                .map((item, index) => ({ item, index }))
                .filter(({ item }) =>
                  (item.title + item.category)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map(({ item, index }) => (
                  <tr key={item.id}>
                    <td>
                      <div className="admin-project-identity">
                        {item.image_url && (
                          <img
                            src={`${item.image_url}${item.image_url.startsWith("/api/") ? `?v=${encodeURIComponent(item.updated_at)}` : ""}`}
                            alt=""
                            width={72}
                            height={72}
                          />
                        )}
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.category}</small>
                        </div>
                      </div>
                      <p>{item.description}</p>
                    </td>
                    <td>
                      <span
                        className={`status-chip ${item.published ? "approved" : "pending"}`}
                      >
                        {item.published ? "Published" : "Draft"}
                      </span>
                      <div className="admin-actions">
                        <button
                          className="ql-button"
                          aria-label={`Move ${item.title} up`}
                          disabled={busy || index === 0 || !!search}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          className="ql-button"
                          aria-label={`Move ${item.title} down`}
                          disabled={
                            busy || index === items.length - 1 || !!search
                          }
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="ql-button"
                          disabled={busy}
                          onClick={() => setEditing(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="ql-button"
                          disabled={busy}
                          onClick={() =>
                            action({
                              action: "Publish",
                              id: item.id,
                              published: !item.published,
                            })
                          }
                        >
                          {item.published ? "Unpublish" : "Publish"}
                        </button>
                        {deleting === item.id ? (
                          <>
                            <span>Delete permanently?</span>
                            <button
                              className="ql-button danger"
                              disabled={busy}
                              onClick={async () => {
                                await action({ action: "Delete", id: item.id });
                                setDeleting(null);
                              }}
                            >
                              Confirm delete
                            </button>
                            <button
                              className="ql-button"
                              onClick={() => setDeleting(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="ql-button danger"
                            disabled={busy}
                            onClick={() => setDeleting(item.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="admin-note">
              No projects yet. Add your first project.
            </p>
          )}
        </div>
      )}
      {editing && (
        <section ref={formSection} className="glass-panel admin-edit">
          <h2>{editing === "new" ? "Add project" : "Edit project"}</h2>
          <form
            className="ql-form"
            onSubmit={save}
            key={editing === "new" ? "new" : editing.id}
          >
            <label>
              Project Title
              <input
                name="title"
                required
                minLength={2}
                maxLength={120}
                defaultValue={editing === "new" ? "" : editing.title}
              />
            </label>
            <label>
              Project Logo
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                required={editing === "new"}
              />
              <small>
                PNG, JPEG or WebP, up to 2 MB / 16 megapixels. Images are
                optimized automatically. Leave empty to keep the current image.
              </small>
            </label>
            <label>
              Short Description
              <textarea
                name="description"
                required
                minLength={10}
                maxLength={600}
                rows={4}
                defaultValue={editing === "new" ? "" : editing.description}
              />
            </label>
            <label>
              Category (optional)
              <input
                name="category"
                maxLength={60}
                defaultValue={editing === "new" ? "" : editing.category}
              />
            </label>
            <label>
              Project URL (optional)
              <input
                name="project_url"
                maxLength={2000}
                placeholder="https://example.com"
                defaultValue={editing === "new" ? "" : editing.project_url}
              />
            </label>
            <label className="ql-check">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing !== "new" && editing.published}
              />
              Published
            </label>
            <div className="admin-actions">
              <button className="ql-button primary" disabled={busy}>
                {busy ? "Saving…" : "Save project"}
              </button>
              <button
                type="button"
                className="ql-button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
