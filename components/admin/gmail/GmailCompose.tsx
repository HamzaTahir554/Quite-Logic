"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import FabricButton from "@/components/ui/FabricButton";
import {
  attachmentLimit,
  totalAttachmentLimit,
  attachmentTypes,
  type MailMessage,
} from "@/lib/gmail/contracts";
export default function GmailCompose({
  reply,
  onClose,
  onSent,
}: {
  reply: MailMessage | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [files, setFiles] = useState<File[]>([]);
  const sending = useRef(false),
    requestId = useRef(crypto.randomUUID());
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || uncertain) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    data.set("requestId", requestId.current);
    if (reply) data.set("messageId", reply.id);
    files.forEach((file) => data.append("attachments", file));
    try {
      const response = await fetch(
        "/api/admin/gmail/" + (reply ? "reply" : "send"),
        { method: "POST", body: data, signal: AbortSignal.timeout(60000) },
      );
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "GMAIL_SEND_UNCERTAIN") setUncertain(true);
        throw new Error(result.error || "Email could not be sent.");
      }
      onSent();
    } catch (error) {
      if (
        error instanceof TypeError ||
        (error instanceof Error &&
          ["TimeoutError", "AbortError", "SyntaxError"].includes(error.name))
      ) {
        setUncertain(true);
        setError(
          "Sending could not be confirmed. Check Sent before creating another message.",
        );
      } else
        setError(
          error instanceof Error ? error.message : "Email could not be sent.",
        );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function close() {
    if (!busy && (uncertain || window.confirm("Discard this email draft?")))
      onClose();
  }
  return (
    <Dialog
      open
      onClose={close}
      fullWidth
      maxWidth="md"
      aria-labelledby="gmail-compose-title"
      slotProps={{ paper: { className: "admin-dialog gmail-compose" } }}
    >
      <DialogTitle id="gmail-compose-title">
        {reply ? "Reply to conversation" : "New message"}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={send} className="gmail-compose-form">
          <fieldset disabled={busy || uncertain}>
            {reply ? (
              <p className="gmail-reply-context">
                <strong>To:</strong> {reply.replyTo}
                <br />
                <strong>Subject:</strong>{" "}
                {/^re:/i.test(reply.subject)
                  ? reply.subject
                  : `Re: ${reply.subject}`}
              </p>
            ) : (
              <>
                <label>
                  To *
                  <input
                    name="to"
                    required
                    placeholder="client@example.com"
                    autoComplete="off"
                    maxLength={3000}
                  />
                </label>
                <div className="gmail-address-grid">
                  <label>
                    CC
                    <input name="cc" maxLength={3000} />
                  </label>
                  <label>
                    BCC
                    <input name="bcc" maxLength={3000} />
                  </label>
                </div>
                <label>
                  Subject *<input name="subject" required maxLength={250} />
                </label>
              </>
            )}
            <label>
              Message *
              <textarea name="body" required maxLength={100000} rows={9} />
            </label>
            <label>
              Attachments
              <input
                type="file"
                multiple
                accept={Object.keys(attachmentTypes)
                  .map((ext) => "." + ext)
                  .join(",")}
                onChange={(event) => {
                  const selected = Array.from(event.target.files || []);
                  if (
                    selected.length > 5 ||
                    selected.some((f) => f.size > attachmentLimit) ||
                    selected.reduce((n, f) => n + f.size, 0) >
                      totalAttachmentLimit
                  ) {
                    setError(
                      "Attach up to five files, 10 MB each and 15 MB total.",
                    );
                    event.target.value = "";
                    setFiles([]);
                    return;
                  }
                  setError("");
                  setFiles(selected);
                }}
              />
            </label>
            <small>
              PDF, DOCX, XLSX, PNG or JPG. Up to five files, 10 MB each and 15
              MB total.
            </small>
            {files.length > 0 && (
              <ul>
                {files.map((file, i) => (
                  <li key={i}>
                    {file.name} · {(file.size / 1024).toFixed(0)} KB
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <div className="gmail-toolbar">
            <FabricButton type="submit" disabled={busy || uncertain}>
              {busy ? "Sending..." : "Send"}
            </FabricButton>
            <button
              className="admin-button"
              type="button"
              onClick={close}
              disabled={busy}
            >
              {uncertain ? "Close" : "Cancel"}
            </button>
          </div>
          <p role="status" className="muted">
            {busy ? "Sending your email. Please keep this window open." : ""}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
