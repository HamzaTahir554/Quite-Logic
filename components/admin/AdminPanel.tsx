"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { reviewServices, type PublicReview } from "@/lib/reviews";
import AdminPortfolio from "./AdminPortfolio";
import PasswordForm from "./PasswordForm";
type Review = PublicReview & { status: string; email: string };
type Message = {
  id: string;
  client_id: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  body: string;
  delivery_status: string;
  created_at: string;
  details?: { phone?: string; budget?: string; projectType?: string };
};
type Client = {
  id: string;
  name: string;
  email: string;
  company: string;
  created_at: string;
  reviews: Review[];
  messages: Message[];
};
type Data = {
  items?: unknown[];
  reviews?: string;
  pending?: string;
  clients?: string;
  messages?: string;
};
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const tabs = [
  ["dashboard", "Dashboard"],
  ["reviews", "Reviews"],
  ["portfolio", "Portfolio"],
  ["clients", "Clients"],
  ["messages", "Contact Messages"],
  ["account", "Account"],
];
export default function AdminPanel({
  section,
  email,
  changePassword = false,
}: {
  section: string;
  email: string;
  changePassword?: boolean;
}) {
  const router = useRouter();

  const actionLock = useRef(false);
  const [data, setData] = useState<Data>({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Review | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    if (editing) {
      const region = document.querySelector<HTMLElement>(".admin-edit");
      region?.scrollIntoView({ block: "start" });
      region
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    }
  }, [editing]);
  useEffect(() => {
    if (["portfolio", "account"].includes(section)) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/admin/${section}?q=${encodeURIComponent(search)}&status=${status}&page=${page}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setData(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error.message || "Could not load data.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [section, search, status, page, revision, router]);
  async function action(resource: string, payload: unknown) {
    if (actionLock.current) return false;
    actionLock.current = true;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.status === 401) router.replace("/admin/login");
      if (!response.ok) throw new Error(result.message);
      setNotice(result.message);
      setRevision((value) => value + 1);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request failed.");
      return false;
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function edit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (
      await action("reviews", {
        id: editing?.id,
        action: "Edit",
        review: { ...values, rating: Number(values.rating) },
      })
    )
      setEditing(null);
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          Quite Logic <span>↗</span>
        </Link>
        <span className="eyebrow">CLIENT WORKSPACE</span>
        <nav aria-label="Admin navigation">
          {tabs.map(([key, label]) => (
            <Link
              key={key}
              href={key === "dashboard" ? "/admin" : `/admin/${key}`}
              aria-current={section === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-session">
          <small>{email}</small>
          <button
            className="ql-button"
            disabled={busy}
            onClick={async () => {
              if (await action("logout", {})) {
                router.replace("/admin/login");
                router.refresh();
              }
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-heading">
          <span className="eyebrow">QUITE LOGIC ADMIN</span>
          <h1>{tabs.find(([key]) => key === section)?.[1]}</h1>
          <p>
            {section === "reviews"
              ? "Only approved reviews appear on your website."
              : "A clear view of your clients and conversations."}
          </p>
        </header>
        <div aria-live="polite">
          <p role="status" className="ql-success">
            {notice}
          </p>
          <p role="alert" className="ql-error">
            {error}
          </p>
        </div>
        {section === "portfolio" ? (
          <AdminPortfolio />
        ) : section === "account" ? (
          changePassword ? (
            <PasswordForm mode="change" />
          ) : (
            <section className="glass-panel admin-note">
              <h2>Account security</h2>
              <p>Change your password or end your current session.</p>
              <div className="admin-actions">
                <Link
                  className="ql-button primary"
                  href="/admin/change-password"
                >
                  Change Password
                </Link>
                <button
                  className="ql-button"
                  disabled={busy}
                  onClick={async () => {
                    if (await action("logout", {})) {
                      router.replace("/admin/login");
                      router.refresh();
                    }
                  }}
                >
                  Logout
                </button>
              </div>
            </section>
          )
        ) : section === "dashboard" ? (
          <>
            <div className="admin-stats">
              {[
                ["reviews", "Reviews"],
                ["pending", "Pending approval"],
                ["clients", "Clients"],
                ["messages", "Messages"],
              ].map(([key, label]) => (
                <Link
                  className="glass-panel"
                  href={`/admin/${key === "pending" ? "reviews" : key}`}
                  key={key}
                >
                  <span>{label}</span>
                  <strong>
                    {loading ? "—" : String(data[key as keyof Data] ?? 0)}
                  </strong>
                </Link>
              ))}
            </div>
            <div className="glass-panel admin-note">
              <h2>Your next step</h2>
              <p>
                Review new submissions, manage projects, and keep client details
                together.
              </p>
              <Link className="ql-button" href="/admin/reviews">
                Review submissions ↗
              </Link>
            </div>
          </>
        ) : (
          <>
            <form
              className="admin-toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(query);
                setPage(0);
              }}
            >
              <label>
                Search
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, company, email or text"
                />
              </label>
              {section === "reviews" && (
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">All statuses</option>
                    {["Pending", "Approved", "Rejected"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}
              <button className="ql-button">Search</button>
            </form>
            <div aria-busy={loading}>
              {loading ? (
                <p role="status">Loading…</p>
              ) : !data.items?.length ? (
                <div className="glass-panel admin-note">
                  No matching {section} yet.
                </div>
              ) : null}
              {!loading && section === "reviews" && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Client / review</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((data.items as Review[]) || []).map((review) => (
                        <tr key={review.id}>
                          <td>
                            <strong>{review.name}</strong>
                            <small>
                              {review.email} · {review.company}
                            </small>
                            <small>
                              {review.role} · {review.service} · {review.rating}
                              /5 · {date(review.created_at)}
                            </small>
                            {review.has_image && (
                              <img
                                src={`/api/review-images/${review.id}`}
                                width={48}
                                height={48}
                                alt="Client profile"
                              />
                            )}
                            <p>{review.body}</p>
                          </td>
                          <td>
                            <span
                              className={`status-chip ${review.status.toLowerCase()}`}
                            >
                              {review.status}
                            </span>
                          </td>
                          <td>
                            <div className="admin-actions">
                              {["Approve", "Reject"].map((value) => (
                                <button
                                  className="ql-button"
                                  key={value}
                                  disabled={
                                    busy ||
                                    (value === "Approve"
                                      ? review.status === "Approved"
                                      : review.status === "Rejected")
                                  }
                                  onClick={() =>
                                    action("reviews", {
                                      id: review.id,
                                      action: value,
                                    })
                                  }
                                >
                                  {value}
                                </button>
                              ))}
                              <button
                                className="ql-button"
                                disabled={busy}
                                onClick={() => setEditing(review)}
                              >
                                Edit
                              </button>
                              {deleting === review.id ? (
                                <>
                                  <span>Delete permanently?</span>
                                  <button
                                    className="ql-button danger"
                                    disabled={busy}
                                    onClick={async () => {
                                      await action("reviews", {
                                        id: review.id,
                                        action: "Delete",
                                      });
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
                                  onClick={() => setDeleting(review.id)}
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
                </div>
              )}
              {!loading && section === "clients" && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Submissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((data.items as Client[]) || []).map((client) => (
                        <tr key={client.id}>
                          <td>
                            <strong>{client.name}</strong>
                            <small>{client.company}</small>
                            <small>{client.email}</small>
                            <small>{date(client.created_at)}</small>
                          </td>
                          <td>
                            <details>
                              <summary>
                                {client.reviews.length} recent reviews ·{" "}
                                {client.messages.length} recent messages
                              </summary>
                              {client.reviews.map((review) => (
                                <div className="client-entry" key={review.id}>
                                  <span className="status-chip">
                                    {review.status}
                                  </span>
                                  <p>{review.body}</p>
                                  <small>{date(review.created_at)}</small>
                                </div>
                              ))}
                              {client.messages.map((message) => (
                                <div className="client-entry" key={message.id}>
                                  <strong>{message.subject}</strong>
                                  <p>{message.body}</p>
                                  <small>{date(message.created_at)}</small>
                                </div>
                              ))}
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && section === "messages" && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Contact message</th>
                        <th>Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((data.items as Message[]) || []).map((message) => (
                        <tr key={message.id}>
                          <td>
                            <strong>{message.name}</strong>
                            <small>{message.email}</small>
                            <small>{message.company}</small>
                          </td>
                          <td>
                            <strong>{message.subject}</strong>
                            <p className="admin-message-body">{message.body}</p>
                            {message.details?.projectType && (
                              <small>
                                Service: {message.details.projectType}
                              </small>
                            )}
                          </td>
                          <td>{date(message.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="admin-pagination">
              <button
                className="ql-button"
                disabled={page === 0 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </button>
              <span>Page {page + 1}</span>
              <button
                className="ql-button"
                disabled={loading || (data.items?.length || 0) < 25}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
        {editing && (
          <section className="glass-panel admin-edit" aria-label="Edit review">
            <h2>Edit review by {editing.name}</h2>
            <form className="ql-form" onSubmit={edit}>
              <div className="ql-form-grid">
                {(
                  [
                    ["name", "Client name"],
                    ["company", "Company"],
                    ["role", "Role"],
                  ] as const
                ).map(([name, label]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      defaultValue={editing[name]}
                      required={name === "name"}
                      minLength={name === "name" ? 2 : undefined}
                      maxLength={name === "company" ? 150 : 100}
                    />
                  </label>
                ))}
                <label>
                  Service
                  <select name="service" defaultValue={editing.service}>
                    {reviewServices.map((service) => (
                      <option key={service}>{service}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Rating
                  <select name="rating" defaultValue={editing.rating}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Review
                <textarea
                  name="body"
                  required
                  minLength={20}
                  maxLength={3000}
                  rows={5}
                  defaultValue={editing.body}
                />
              </label>
              <div className="admin-actions">
                <button className="ql-button primary" disabled={busy}>
                  Save changes
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
    </div>
  );
}
