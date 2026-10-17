"use client";
import { useRef, useState } from "react";
import { socialLinkSchema } from "@/lib/admin-validation";
import { socialPlatforms, type ManagedSocialLink } from "@/lib/social-links";
import SocialIcon from "@/components/ui/SocialIcon";
import AdminIcon from "./AdminIcon";
import { EmptyState, ListError, ListSkeleton } from "./AdminElements";
import {
  useAdminAction,
  useAdminFeedback,
  useUnsavedChanges,
} from "./AdminFeedback";
import { AdminRequestError, apiCall, useAdminList } from "./useAdminList";

type Values = {
  platform: string;
  url: string;
  enabled: boolean;
  order: number;
};
const blank: Values = {
  platform: "LinkedIn",
  url: "",
  enabled: false,
  order: 0,
};
export default function SocialLinkManager() {
  const list = useAdminList<ManagedSocialLink>("socials");
  const action = useAdminAction();
  const { confirm } = useAdminFeedback();
  const [editing, setEditing] = useState<ManagedSocialLink | "new" | null>(
    null,
  );
  const [values, setValues] = useState<Values>(blank);
  const [original, setOriginal] = useState<Values>(blank);
  const [fields, setFields] = useState<Record<string, string>>({});
  const editor = useRef<HTMLElement>(null);
  const dirty =
    editing !== null && JSON.stringify(values) !== JSON.stringify(original);
  useUnsavedChanges(dirty);
  function change<K extends keyof Values>(name: K, value: Values[K]) {
    setValues((current) => ({ ...current, [name]: value }));
    setFields((current) => ({ ...current, [name]: "" }));
  }
  function edit(link: ManagedSocialLink | "new") {
    const next =
      link === "new"
        ? {
            ...blank,
            platform:
              socialPlatforms.find(
                (p) => !list.items.some((item) => item.platform === p),
              ) || "LinkedIn",
            order: list.items.length
              ? Math.min(
                  1000000,
                  Math.max(...list.items.map((item) => item.order)) + 1,
                )
              : 0,
          }
        : {
            platform: link.platform,
            url: link.url,
            enabled: link.enabled,
            order: link.order,
          };
    setValues(next);
    setOriginal(next);
    setFields({});
    action.setError("");
    setEditing(link);
    requestAnimationFrame(() => {
      editor.current?.scrollIntoView({ block: "start", behavior: "instant" });
      editor.current
        ?.querySelector<HTMLSelectElement>("select")
        ?.focus({ preventScroll: true });
    });
  }
  async function cancel() {
    if (
      dirty &&
      !(await confirm({
        title: "Discard your changes?",
        description: "Your social link changes haven’t been saved.",
        action: "Discard changes",
        danger: true,
      }))
    )
      return;
    setEditing(null);
    setFields({});
    action.setError("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (action.busy) return;
    const parsed = socialLinkSchema.safeParse(values);
    if (!parsed.success) {
      setFields(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      requestAnimationFrame(() =>
        editor.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    setFields({});
    const success = await action.run(async () => {
      try {
        await apiCall(
          editing === "new"
            ? "/api/admin/socials"
            : `/api/admin/socials/${(editing as ManagedSocialLink)._id}`,
          editing === "new" ? "POST" : "PATCH",
          parsed.data,
        );
      } catch (error) {
        if (error instanceof AdminRequestError) setFields(error.fields);
        throw error;
      }
    }, "Social link saved successfully.");
    if (success) {
      setEditing(null);
      list.refresh();
    }
  }
  async function remove(link: ManagedSocialLink) {
    if (
      !(await confirm({
        title: "Delete this social link?",
        description: `${link.platform} will be removed from your website. This cannot be undone.`,
        action: "Delete link",
        danger: true,
      }))
    )
      return;
    if (
      await action.run(
        () => apiCall(`/api/admin/socials/${link._id}`, "DELETE"),
        "Social link deleted.",
      )
    )
      list.refresh();
  }
  async function toggle(link: ManagedSocialLink) {
    if (
      await action.run(
        () =>
          apiCall(`/api/admin/socials/${link._id}`, "PATCH", {
            enabled: !link.enabled,
          }),
        link.enabled
          ? `${link.platform} hidden from your website.`
          : `${link.platform} enabled on your website.`,
      )
    )
      list.refresh();
  }
  async function move(link: ManagedSocialLink, direction: "earlier" | "later") {
    if (
      await action.run(
        () =>
          apiCall("/api/admin/socials/reorder", "POST", {
            id: link._id,
            direction,
          }),
        "Social link order updated.",
      )
    )
      list.refresh();
  }
  const blocked = action.busy || list.loading || editing !== null;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Stay connected</span>
          <h1>Social Links</h1>
          <p>Manage the links visitors see in your website footer.</p>
        </div>
        <button
          className="admin-button is-primary"
          disabled={blocked || list.items.length >= socialPlatforms.length}
          onClick={() => edit("new")}
        >
          <AdminIcon name="Plus" />
          Add social link
        </button>
      </div>
      {editing !== null && (
        <section
          className="admin-panel admin-social-editor"
          ref={editor}
          aria-labelledby="social-editor-title"
        >
          <h2 id="social-editor-title">
            {editing === "new" ? "Add social link" : `Edit ${editing.platform}`}
          </h2>
          <p className="admin-help">
            Required fields are marked *. Enable a link when it’s ready to
            appear publicly.
          </p>
          <form className="admin-form" onSubmit={save} noValidate>
            <fieldset disabled={action.busy} className="admin-social-fields">
              <label htmlFor="social-platform">
                Platform *
                <select
                  id="social-platform"
                  required
                  value={values.platform}
                  aria-invalid={!!fields.platform}
                  aria-describedby={
                    fields.platform ? "social-platform-error" : undefined
                  }
                  onChange={(e) =>
                    change("platform", e.target.value)
                  }
                >
                  {socialPlatforms.map((platform) => (
                    <option
                      key={platform}
                      value={platform}
                      disabled={list.items.some(
                        (link) =>
                          link.platform === platform &&
                          (editing === "new" || link._id !== editing._id),
                      )}
                    >
                      {platform === "X" ? "X / Twitter" : platform}
                    </option>
                  ))}
                </select>
                {fields.platform && (
                  <span
                    className="admin-field-error"
                    id="social-platform-error"
                  >
                    {fields.platform}
                  </span>
                )}
              </label>
              <label htmlFor="social-url">
                Profile URL *
                <input
                  id="social-url"
                  type="url"
                  inputMode="url"
                  required
                  maxLength={2000}
                  placeholder="https://www.linkedin.com/company/your-company"
                  value={values.url}
                  aria-invalid={!!fields.url}
                  aria-describedby={
                    fields.url ? "social-url-error" : "social-url-help"
                  }
                  onChange={(e) =>
                    change("url", e.target.value)
                  }
                />
                <small id="social-url-help">
                  Paste the complete public profile URL, starting with https://.
                </small>
                {fields.url && (
                  <span className="admin-field-error" id="social-url-error">
                    {fields.url}
                  </span>
                )}
              </label>
              <label htmlFor="social-order">
                Display order
                <input
                  id="social-order"
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  value={Number.isNaN(values.order) ? "" : values.order}
                  aria-invalid={!!fields.order}
                  aria-describedby={
                    fields.order ? "social-order-error" : "social-order-help"
                  }
                  onChange={(e) =>
                    change("order", e.target.valueAsNumber)
                  }
                />
                <small id="social-order-help">
                  Lower numbers appear first.
                </small>
                {fields.order && (
                  <span className="admin-field-error" id="social-order-error">
                    {fields.order}
                  </span>
                )}
              </label>
              <label className="admin-social-enabled" htmlFor="social-enabled">
                <input
                  id="social-enabled"
                  type="checkbox"
                  checked={values.enabled}
                  onChange={(e) =>
                    change("enabled", e.target.checked)
                  }
                />
                Enabled on the website
              </label>
            </fieldset>
            {action.error && (
              <p className="admin-error" role="alert">
                {action.error}
              </p>
            )}
            <div className="admin-editor-actions">
              <button
                type="button"
                className="admin-button"
                disabled={action.busy}
                onClick={cancel}
              >
                Cancel
              </button>
              <button
                className="admin-button is-primary"
                disabled={action.busy}
              >
                {action.busy ? "Saving…" : "Save link"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section
        className="admin-panel"
        aria-labelledby="social-list-title"
        aria-busy={list.loading || action.busy}
      >
        <h2 id="social-list-title">Your social links</h2>
        <p className="admin-help">
          Only enabled links appear publicly. Use the arrows to change their
          order.
        </p>
        {action.error && editing === null && (
          <p className="admin-error" role="alert">
            {action.error}
          </p>
        )}
        {list.error ? (
          <ListError message={list.error} retry={list.refresh} />
        ) : list.loading && !list.items.length ? (
          <ListSkeleton />
        ) : !list.items.length ? (
          <EmptyState
            title="No social links yet"
            description="Add LinkedIn, Instagram, GitHub or another profile. New links stay hidden until you enable them."
          />
        ) : (
          <div className="admin-social-list">
            <div className="admin-social-columns" aria-hidden="true">
              <span>Platform</span>
              <span>URL</span>
              <span>Status</span>
              <span>Order & actions</span>
            </div>
            {list.items.map((link, index) => (
              <article
                className="admin-social-row"
                key={link._id}
                aria-label={`${link.platform} social link`}
              >
                <h3>
                  <SocialIcon platform={link.platform} />
                  {link.platform === "X" ? "X / Twitter" : link.platform}
                </h3>
                <a
                  className="admin-social-url"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${link.platform} profile (opens in a new tab)`}
                >
                  {link.url}
                </a>
                <button
                  role="switch"
                  aria-checked={link.enabled}
                  aria-label={`Enable ${link.platform}`}
                  className={`admin-social-toggle ${link.enabled ? "is-enabled" : ""}`}
                  disabled={blocked}
                  onClick={() => toggle(link)}
                >
                  <span aria-hidden="true" />
                  {link.enabled ? "Enabled" : "Disabled"}
                </button>
                <div className="admin-social-actions">
                  <span className="admin-help">Order {link.order}</span>
                  <div>
                    <button
                      className="admin-icon-button"
                      aria-label={`Move ${link.platform} earlier`}
                      disabled={blocked || index === 0}
                      onClick={() => move(link, "earlier")}
                    >
                      ↑
                    </button>
                    <button
                      className="admin-icon-button"
                      aria-label={`Move ${link.platform} later`}
                      disabled={blocked || index === list.items.length - 1}
                      onClick={() => move(link, "later")}
                    >
                      ↓
                    </button>
                    <button
                      className="admin-button"
                      disabled={blocked}
                      onClick={() => edit(link)}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-button is-danger"
                      disabled={blocked}
                      onClick={() => remove(link)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
