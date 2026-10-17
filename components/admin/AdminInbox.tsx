"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { contactEmail } from "@/lib/company";

type Item = {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  preview: string;
  received_at: string;
  inbox_status: string;
  is_read: boolean;
  source: string;
  delivery_status: string;
};
type Reply = {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  status: string;
  created_at: string;
};
type Detail = Item & { body: string; to_email: string };
type Data = {
  items: Item[];
  total: number;
  emailReady: boolean;
  history: Reply[];
};
const date = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
export default function AdminInbox() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<Data>({
    items: [],
    total: 0,
    emailReady: false,
    history: [],
  });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [read, setRead] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [compose, setCompose] = useState(!!params.get("client"));
  const [recipient, setRecipient] = useState("");
  const [replyText, setReplyText] = useState("");
  const lock = useRef(false);
  const sendKey = useRef<string | null>(null);
  const replyKey = useRef<string | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const detailRegion = useRef<HTMLElement>(null);
  async function api(path: string, options?: RequestInit) {
    const response = await fetch(path, options);
    if (response.status === 401) router.replace("/admin/login");
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Unable to complete this request.");
    return result;
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(
      `/api/admin/emails?q=${encodeURIComponent(search)}&status=${status}&read=${read}&page=${page}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (response.status === 401) router.replace("/admin/login");
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, status, read, page, revision, router]);
  useEffect(() => {
    const id = params.get("client");
    if (!id) return;
    const controller = new AbortController();
    fetch(`/api/admin/clients?selected=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Could not load the selected client.");
        return response.json();
      })
      .then((result) =>
        setRecipient(
          result.items.find(
            (client: { id: string; email: string }) => client.id === id,
          )?.email || "",
        ),
      )
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [params]);
  useEffect(() => () => detailAbort.current?.abort(), []);
  async function open(item: Item) {
    detailAbort.current?.abort();
    const controller = new AbortController();
    detailAbort.current = controller;
    setOpening(true);
    setError("");
    setDetail(null);
    setReplyText("");
    replyKey.current = null;
    try {
      const result = await api(`/api/admin/emails/${item.id}`, {
        signal: controller.signal,
      });
      if (!result.item.is_read)
        await api(`/api/admin/emails/${item.id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
          signal: controller.signal,
        });
      if (controller.signal.aborted) return;
      setDetail({ ...result.item, is_read: true });
      setReplies(result.replies);
      setRevision((v) => v + 1);
      requestAnimationFrame(() => detailRegion.current?.focus());
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Could not open message.");
    } finally {
      if (!controller.signal.aborted) setOpening(false);
    }
  }
  async function action(
    path: string,
    method: string,
    body?: unknown,
    key?: string,
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      setNotice(result.message);
      setRevision((v) => v + 1);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this request.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    replyKey.current ??= crypto.randomUUID();
    if (
      await action(
        `/api/admin/emails/${detail.id}/reply`,
        "POST",
        { message: replyText },
        replyKey.current,
      )
    ) {
      setReplyText("");
      replyKey.current = null;
      setDetail({ ...detail, inbox_status: "replied" });
      const result = await api(`/api/admin/emails/${detail.id}`).catch(
        () => null,
      );
      if (result) setReplies(result.replies);
    }
  }
  return (
    <section className="admin-inbox" aria-label="Email inbox">
      <div className="admin-actions">
        <p>Contact inquiries and direct emails, together.</p>
        <button
          className="ql-button primary"
          onClick={() => setCompose((v) => !v)}
          aria-expanded={compose}
        >
          Compose email
        </button>
      </div>
      <div aria-live="polite">
        <p role="status" className="ql-success">
          {notice}
        </p>
        <p role="alert" className="ql-error">
          {error}
        </p>
      </div>
      {!data.emailReady && !loading && (
        <p className="admin-note glass-panel">
          Email sending is not configured. Set the server-only SMTP settings and
          credentials to enable sending.
        </p>
      )}
      {compose && (
        <section className="glass-panel admin-compose" id="compose">
          <h2>Write an email</h2>
          <p>From {contactEmail}</p>
          <form
            className="ql-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const values = new FormData(form);
              sendKey.current ??= crypto.randomUUID();
              if (
                await action(
                  "/api/admin/emails",
                  "POST",
                  {
                    to: recipient,
                    subject: values.get("subject"),
                    body: values.get("body"),
                  },
                  sendKey.current,
                )
              ) {
                form.reset();
                setRecipient("");
                sendKey.current = null;
              }
            }}
            onChange={() => {
              sendKey.current = null;
            }}
          >
            <label>
              To
              <input
                type="email"
                required
                maxLength={254}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </label>
            <label>
              Subject
              <input name="subject" required maxLength={180} />
            </label>
            <label>
              Message
              <textarea name="body" rows={6} required maxLength={10000} />
            </label>
            <button
              className="ql-button primary"
              disabled={busy || !data.emailReady}
            >
              {busy ? "Sending…" : "Send email"}
            </button>
          </form>
        </section>
      )}
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
          setPage(0);
        }}
      >
        <label>
          Search messages
          <input
            value={query}
            maxLength={150}
            placeholder="Sender, email or subject"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="inbox">Inbox</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Read state
          <select
            value={read}
            onChange={(e) => {
              setRead(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All messages</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
        <button className="ql-button">Search</button>
      </form>
      <div className="inbox-layout">
        <div aria-busy={loading} className="inbox-list">
          {loading ? (
            <p role="status">Loading messages…</p>
          ) : !data.items.length ? (
            <p className="glass-panel admin-note">No matching messages yet.</p>
          ) : (
            data.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`glass-panel inbox-row ${item.is_read ? "" : "unread"}`}
                onClick={() => open(item)}
                aria-pressed={detail?.id === item.id}
              >
                <span className="inbox-row-heading">
                  <strong>
                    {!item.is_read && (
                      <span className="unread-dot" aria-label="Unread" />
                    )}
                    {item.from_name || item.from_email}
                  </strong>
                  <span className="status-chip">{item.inbox_status}</span>
                </span>
                <small>{item.from_email}</small>
                <strong>{item.subject}</strong>
                <span className="inbox-preview">{item.preview}</span>
                <small>
                  {date(item.received_at)} ·{" "}
                  {item.source === "contact_form" ? "Website form" : "Email"}
                </small>
              </button>
            ))
          )}
        </div>
        {opening ? (
          <p role="status">Opening message…</p>
        ) : detail ? (
          <section
            className="glass-panel inbox-detail"
            aria-label="Message detail"
            ref={detailRegion}
            tabIndex={-1}
          >
            <div className="inbox-row-heading">
              <h2>{detail.subject}</h2>
              <button
                className="ql-button"
                onClick={() => {
                  setDetail(null);
                  setReplyText("");
                }}
              >
                Close
              </button>
            </div>
            <dl>
              <dt>From</dt>
              <dd>{detail.from_name}</dd>
              <dt>Email</dt>
              <dd>{detail.from_email}</dd>
              <dt>To</dt>
              <dd>{detail.to_email}</dd>
              <dt>Date</dt>
              <dd>{date(detail.received_at)}</dd>
            </dl>
            <p className="inbox-body">{detail.body}</p>
            <div className="admin-actions">
              <button
                className="ql-button"
                disabled={busy}
                onClick={async () => {
                  if (
                    await action(
                      `/api/admin/emails/${detail.id}/read`,
                      "PATCH",
                      { isRead: !detail.is_read },
                    )
                  )
                    setDetail({ ...detail, is_read: !detail.is_read });
                }}
              >
                {detail.is_read ? "Mark unread" : "Mark read"}
              </button>
              <button
                className="ql-button"
                disabled={busy}
                onClick={async () => {
                  const archived = detail.inbox_status !== "archived";
                  if (
                    await action(
                      `/api/admin/emails/${detail.id}/archive`,
                      "PATCH",
                      { archived },
                    )
                  )
                    setDetail({
                      ...detail,
                      inbox_status: archived ? "archived" : "inbox",
                    });
                }}
              >
                {detail.inbox_status === "archived"
                  ? "Move to inbox"
                  : "Archive"}
              </button>
              <button
                className="ql-button danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    window.confirm(
                      "Delete this message from the Inbox? Client details will be kept.",
                    ) &&
                    (await action(`/api/admin/emails/${detail.id}`, "DELETE"))
                  )
                    setDetail(null);
                }}
              >
                Delete
              </button>
            </div>
            <form className="ql-form inbox-reply" onSubmit={reply}>
              <label>
                Reply
                <textarea
                  required
                  rows={5}
                  maxLength={10000}
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    replyKey.current = null;
                  }}
                />
              </label>
              <button
                className="ql-button primary"
                disabled={busy || !data.emailReady}
              >
                {busy ? "Sending…" : "Send reply"}
              </button>
              <small>From {contactEmail}</small>
            </form>
            {!!replies.length && (
              <section className="inbox-replies">
                <h3>Reply history</h3>
                {replies.map((item) => (
                  <article key={item.id}>
                    <strong>{item.subject}</strong>
                    <small>
                      {item.recipient} · {date(item.created_at)} · {item.status}
                    </small>
                    <p className="inbox-body">{item.body}</p>
                  </article>
                ))}
              </section>
            )}
          </section>
        ) : (
          <div className="glass-panel inbox-placeholder">
            <h2>Your conversations</h2>
            <p>Select a message to read it or send a reply.</p>
          </div>
        )}
      </div>
      <div className="admin-pagination">
        <button
          className="ql-button"
          disabled={!page || loading}
          onClick={() => setPage((v) => v - 1)}
        >
          Previous
        </button>
        <span>
          Page {page + 1} · {data.total} messages
        </span>
        <button
          className="ql-button"
          disabled={loading || (page + 1) * 25 >= data.total}
          onClick={() => setPage((v) => v + 1)}
        >
          Next
        </button>
      </div>
      <section className="admin-history">
        <h2>Email history</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((item) => (
                <tr key={item.id}>
                  <td>{item.recipient}</td>
                  <td>{item.subject}</td>
                  <td>{date(item.created_at)}</td>
                  <td>
                    <span className="status-chip">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.history.length && <p>No emails sent yet.</p>}
      </section>
    </section>
  );
}
