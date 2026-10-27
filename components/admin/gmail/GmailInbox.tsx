"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useGmailStatus } from "./GmailStatus";
import GmailConnection from "./GmailConnection";
import GmailCompose from "./GmailCompose";
import { apiCall } from "../useAdminList";
import { useAdminFeedback } from "../AdminFeedback";
import FabricButton from "@/components/ui/FabricButton";
import type {
  Mailbox,
  MailSummary,
  MailMessage,
  MailPage,
  MailThread,
} from "@/lib/gmail/contracts";
function dateLabel(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
export default function GmailInbox() {
  const {
    status,
    error: statusError,
    refresh: refreshStatus,
  } = useGmailStatus();
  const { notify } = useAdminFeedback();
  const [folder, setFolder] = useState<Mailbox>("inbox"),
    [query, setQuery] = useState(""),
    [draftQuery, setDraftQuery] = useState("");
  const [items, setItems] = useState<MailSummary[]>([]),
    [nextPage, setNextPage] = useState<string | undefined>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(""),
    [thread, setThread] = useState<MailThread | null>(null),
    [opening, setOpening] = useState(false),
    [acting, setActing] = useState(false);
  const [compose, setCompose] = useState<{ reply: MailMessage | null } | null>(
    null,
  );
  const listRequest = useRef<AbortController | null>(null),
    detailRequest = useRef<AbortController | null>(null),
    actionLock = useRef(false);
  const reader = useRef<HTMLElement | null>(null),
    selectedButton = useRef<HTMLButtonElement | null>(null);
  const load = useCallback(
    async (pageToken?: string) => {
      if (!status?.connected || document.hidden) return;
      listRequest.current?.abort();
      const controller = new AbortController();
      listRequest.current = controller;
      const timeout = setTimeout(() => controller.abort(), 30000);
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          "/api/admin/gmail/messages?" +
            new URLSearchParams({
              folder,
              q: query,
              ...(pageToken ? { pageToken } : {}),
            }),
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) {
          if (result.code === "GMAIL_RECONNECT") void refreshStatus();
          throw new Error(result.error || "Could not load emails.");
        }
        if (controller.signal.aborted) return;
        const data = result as MailPage;
        setItems((previous) => {
          const conversations = new Map<string, MailSummary>();
          for (const item of pageToken
            ? [...previous, ...data.items]
            : data.items) {
            const earlier = conversations.get(item.threadId);
            conversations.set(
              item.threadId,
              earlier
                ? {
                    ...earlier,
                    unread: earlier.unread || item.unread,
                    starred: earlier.starred || item.starred,
                    hasAttachments:
                      earlier.hasAttachments || item.hasAttachments,
                  }
                : item,
            );
          }
          return [...conversations.values()];
        });
        setNextPage(data.nextPageToken);
      } catch (error) {
        if (listRequest.current === controller)
          setError(
            controller.signal.aborted
              ? "Loading timed out. Refresh to try again."
              : error instanceof Error
                ? error.message
                : "Could not load emails.",
          );
      } finally {
        clearTimeout(timeout);
        if (listRequest.current === controller) {
          listRequest.current = null;
          setLoading(false);
        }
      }
    },
    [folder, query, status?.connected, refreshStatus],
  );
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (!listRequest.current) void load();
    }, 45000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      listRequest.current?.abort();
      listRequest.current = null;
    };
  }, [load]);
  useEffect(
    () => () => {
      detailRequest.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (thread) reader.current?.focus({ preventScroll: true });
  }, [thread]);
  async function openMessage(item: MailSummary, button: HTMLButtonElement) {
    selectedButton.current = button;
    setSelected(item.threadId);
    setThread(null);
    setOpening(true);
    setError("");
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(
        "/api/admin/gmail/threads/" + encodeURIComponent(item.threadId),
        { signal: controller.signal, cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not open conversation.");
      if (controller.signal.aborted) return;
      const data = result as MailThread;
      setThread(data);
      const unread = data.messages.filter((message) => message.unread);
      for (const message of unread) {
        await apiCall(
          "/api/admin/gmail/messages/" + encodeURIComponent(message.id),
          "PATCH",
          { action: "read" },
        );
        if (controller.signal.aborted) return;
        setItems((previous) =>
          previous.map((row) =>
            row.id === message.id ? { ...row, unread: false } : row,
          ),
        );
        setThread((previous) =>
          previous?.id === data.id
            ? {
                ...previous,
                messages: previous.messages.map((row) =>
                  row.id === message.id ? { ...row, unread: false } : row,
                ),
              }
            : previous,
        );
      }
      if (unread.length) {
        setItems((previous) =>
          previous.map((row) =>
            row.threadId === data.id ? { ...row, unread: false } : row,
          ),
        );
        void refreshStatus();
      }
    } catch (error) {
      if (detailRequest.current === controller)
        setError(
          controller.signal.aborted
            ? "Opening timed out. Please try again."
            : error instanceof Error
              ? error.message
              : "Could not open conversation.",
        );
    } finally {
      clearTimeout(timeout);
      if (detailRequest.current === controller) {
        detailRequest.current = null;
        setOpening(false);
      }
    }
  }
  async function change(
    message: MailMessage,
    action: "read" | "unread" | "archive" | "star" | "unstar",
  ) {
    if (actionLock.current) return;
    actionLock.current = true;
    setActing(true);
    setError("");
    try {
      await apiCall(
        "/api/admin/gmail/messages/" + encodeURIComponent(message.id),
        "PATCH",
        { action },
      );
      const update = <T extends MailSummary>(row: T): T =>
        row.id !== message.id
          ? row
          : {
              ...row,
              ...(action === "read" || action === "unread"
                ? { unread: action === "unread" }
                : {}),
              ...(action === "star" || action === "unstar"
                ? { starred: action === "star" }
                : {}),
            };
      setThread((previous) =>
        previous
          ? { ...previous, messages: previous.messages.map(update) }
          : null,
      );
      setItems((previous) =>
        previous
          .filter(
            (row) =>
              !(
                ((action === "archive" && folder === "inbox") ||
                  (action === "unstar" && folder === "starred")) &&
                row.id === message.id
              ),
          )
          .map(update),
      );
      void refreshStatus();
      void load();
      notify(
        action === "archive"
          ? "Email archived. It remains in Gmail."
          : "Email updated.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not update email.",
      );
    } finally {
      actionLock.current = false;
      setActing(false);
    }
  }
  function back() {
    detailRequest.current?.abort();
    detailRequest.current = null;
    setSelected("");
    setThread(null);
    setOpening(false);
    requestAnimationFrame(() => selectedButton.current?.focus());
  }
  function search(event: FormEvent) {
    event.preventDefault();
    back();
    setItems([]);
    setNextPage(undefined);
    setQuery(draftQuery.trim());
  }
  return (
    <section className="gmail-inbox">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">BUSINESS EMAIL</span>
          <h1>Inbox</h1>
          <p className="muted">Conversations, connected to your work.</p>
        </div>
        {status?.connected && (
          <FabricButton onClick={() => setCompose({ reply: null })}>
            Compose
          </FabricButton>
        )}
      </div>
      {!status?.connected && <GmailConnection />}
      {status?.connected && (
        <>
          <div className="gmail-account-line">
            <span>
              <span className="gmail-connected-dot" />
              Connected · {status.accountEmail}
            </span>
            <Link href="/admin/settings">Connection settings</Link>
          </div>
          {(error || statusError) && (
            <p role="alert" className="admin-error">
              {error || statusError}
            </p>
          )}
          <div className="gmail-mail-controls">
            <nav aria-label="Mail folders">
              {(["inbox", "sent", "starred"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={folder === value}
                  onClick={() => {
                    back();
                    setItems([]);
                    setNextPage(undefined);
                    setFolder(value);
                  }}
                >
                  {value === "inbox"
                    ? "Inbox"
                    : value === "sent"
                      ? "Sent"
                      : "Starred"}
                </button>
              ))}
            </nav>
            <form onSubmit={search} role="search">
              <label className="gmail-sr-only" htmlFor="gmail-search">
                Search mail
              </label>
              <input
                id="gmail-search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search mail..."
                maxLength={300}
              />
              <button type="submit" className="admin-button">
                Search
              </button>
            </form>
            <button
              className="admin-button"
              disabled={loading}
              onClick={() => {
                void load();
                void refreshStatus();
                const item = items.find((row) => row.threadId === selected);
                if (item && selectedButton.current)
                  void openMessage(item, selectedButton.current);
              }}
            >
              {" "}
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div
            className={"gmail-mail-layout" + (selected ? " has-selection" : "")}
          >
            <section
              className="gmail-mail-list admin-panel"
              aria-label={folder + " messages"}
              aria-busy={loading}
            >
              {loading && !items.length && (
                <p role="status">Loading emails...</p>
              )}
              {!loading && !items.length && (
                <p className="gmail-empty">
                  {query ? "No emails found." : "No emails yet."}
                </p>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  className={
                    "gmail-mail-row" +
                    (item.unread ? " is-unread" : "") +
                    (selected === item.threadId ? " is-selected" : "")
                  }
                  onClick={(event) =>
                    void openMessage(item, event.currentTarget)
                  }
                  aria-label={
                    (item.unread ? "Unread: " : "") +
                    item.subject +
                    " - " +
                    (folder === "sent" ? item.to : item.from)
                  }
                >
                  <span className="gmail-row-top">
                    <strong>{folder === "sent" ? item.to : item.from}</strong>
                    <time dateTime={item.date}>{dateLabel(item.date)}</time>
                  </span>
                  <span className="gmail-row-subject">
                    {item.unread && (
                      <span className="gmail-unread-dot" aria-hidden="true" />
                    )}
                    {item.starred && <span aria-label="Starred">★ </span>}
                    {item.subject}
                    {item.hasAttachments && (
                      <span
                        className="gmail-paperclip"
                        aria-label="Has attachments"
                      >
                        {" "}
                        · Attachment
                      </span>
                    )}
                  </span>
                  <span className="gmail-row-preview">{item.snippet}</span>
                </button>
              ))}
              {nextPage && (
                <button
                  className="admin-button gmail-load-more"
                  disabled={loading}
                  onClick={() => void load(nextPage)}
                >
                  {" "}
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
            </section>
            <section
              ref={reader}
              tabIndex={-1}
              className="gmail-mail-reader admin-panel"
              aria-label="Email conversation"
              aria-busy={opening}
            >
              {selected && (
                <button className="admin-text-link gmail-back" onClick={back}>
                  ←{" "}
                  {folder === "sent"
                    ? "Sent"
                    : folder === "starred"
                      ? "Starred"
                      : "Inbox"}
                </button>
              )}
              {opening && <p role="status">Opening conversation...</p>}
              {!selected && (
                <div className="gmail-empty">
                  <h2>A little space for conversation.</h2>
                  <p>Select an email to read the full thread.</p>
                </div>
              )}
              {thread && (
                <>
                  <h2 className="gmail-thread-subject">
                    {thread.messages[0]?.subject}
                  </h2>
                  {thread.messages.map((message) => (
                    <article key={message.id} className="gmail-message">
                      <header>
                        <strong>{message.from}</strong>
                        <time dateTime={message.date}>
                          {dateLabel(message.date)}
                        </time>
                      </header>
                      <p className="gmail-envelope">
                        To: {message.to}
                        {message.cc && (
                          <>
                            <br />
                            CC: {message.cc}
                          </>
                        )}
                      </p>
                      <div className="gmail-message-actions">
                        <button
                          className="admin-button"
                          disabled={acting}
                          onClick={() =>
                            void change(
                              message,
                              message.unread ? "read" : "unread",
                            )
                          }
                        >
                          {message.unread ? "Mark as read" : "Mark as unread"}
                        </button>
                        <button
                          className="admin-button"
                          disabled={acting}
                          onClick={() =>
                            void change(
                              message,
                              message.starred ? "unstar" : "star",
                            )
                          }
                        >
                          {message.starred ? "Unstar" : "Star"}
                        </button>
                        <button
                          className="admin-button"
                          disabled={acting}
                          onClick={() => void change(message, "archive")}
                        >
                          Archive
                        </button>
                      </div>
                      {message.html ? (
                        <div
                          className="gmail-email-body"
                          dangerouslySetInnerHTML={{ __html: message.html }}
                        />
                      ) : (
                        <div className="gmail-email-body gmail-plain-body">
                          {message.text || "No text body in this email."}
                        </div>
                      )}
                      {message.attachments.length > 0 && (
                        <ul className="gmail-attachments">
                          {message.attachments.map((attachment) => (
                            <li key={attachment.partId}>
                              <span>
                                <strong>{attachment.filename}</strong>
                                <small>
                                  {attachment.mimeType} ·{" "}
                                  {(attachment.size / 1024).toFixed(0)} KB
                                </small>
                              </span>
                              <a
                                className="admin-text-link"
                                href={
                                  "/api/admin/gmail/attachments/" +
                                  encodeURIComponent(message.id) +
                                  "/" +
                                  encodeURIComponent(
                                    attachment.id || "inline",
                                  ) +
                                  "?part=" +
                                  encodeURIComponent(attachment.partId)
                                }
                                download
                              >
                                Download
                                <span className="gmail-sr-only">
                                  {" "}
                                  {attachment.filename}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      {message.replyable &&
                        message.replyTo.toLowerCase() !==
                          status.accountEmail?.toLowerCase() && (
                          <FabricButton
                            variant="secondary"
                            onClick={() => setCompose({ reply: message })}
                          >
                            Reply
                          </FabricButton>
                        )}
                    </article>
                  ))}
                </>
              )}
            </section>
          </div>
        </>
      )}
      {compose && (
        <GmailCompose
          reply={compose.reply}
          onClose={() => setCompose(null)}
          onSent={() => {
            setCompose(null);
            notify("Email sent.");
            back();
            void load();
            void refreshStatus();
          }}
        />
      )}
    </section>
  );
}
