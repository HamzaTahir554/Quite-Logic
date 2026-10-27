import "server-only";
import type { gmail_v1 } from "@googleapis/gmail";
import sanitizeHtml from "sanitize-html";
import addressparser from "nodemailer/lib/addressparser";
import { ApiError } from "../api";
import type { MailAttachment, MailMessage, MailSummary } from "./contracts";
export function header(message: gmail_v1.Schema$Message, name: string) {
  return (
    message.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    )?.value || ""
  );
}
export function decodeHeader(value: string) {
  return value
    .replace(/(=\?[^?]+\?[bq]\?[^?]*\?=)\s+(?==\?)/gi, "$1")
    .replace(
      /=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,
      (_, charset: string, encoding: string, data: string) => {
        try {
          const bytes =
            encoding.toLowerCase() === "b"
              ? Buffer.from(data, "base64")
              : Buffer.from(
                  data
                    .replace(/_/g, " ")
                    .replace(/=([a-f0-9]{2})/gi, (_: string, hex: string) =>
                      String.fromCharCode(parseInt(hex, 16)),
                    ),
                  "latin1",
                );
          return new TextDecoder(charset).decode(bytes);
        } catch {
          return data;
        }
      },
    );
}
export function safeFilename(name: string) {
  return (
    name
      .replace(/[\u0000-\u001f\u007f/\\"<>:|?*]/g, "_")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 160) || "attachment"
  );
}
export function parts(message: gmail_v1.Schema$Message) {
  const all: gmail_v1.Schema$MessagePart[] = [];
  function walk(part: gmail_v1.Schema$MessagePart, depth: number) {
    if (depth > 30 || all.length >= 300) return;
    all.push(part);
    part.parts?.forEach((p) => walk(p, depth + 1));
  }
  if (message.payload) walk(message.payload, 0);
  return all;
}
export function summary(message: gmail_v1.Schema$Message): MailSummary {
  const timestamp = Number(message.internalDate),
    date =
      Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp).toISOString()
        : "";
  return {
    id: message.id || "",
    threadId: message.threadId || "",
    from: decodeHeader(header(message, "From")).slice(0, 2000),
    to: decodeHeader(header(message, "To")).slice(0, 4000),
    cc: decodeHeader(header(message, "Cc")).slice(0, 4000),
    subject:
      decodeHeader(header(message, "Subject")).slice(0, 1000) || "(No subject)",
    date,
    snippet: (message.snippet || "").slice(0, 500),
    unread: message.labelIds?.includes("UNREAD") || false,
    starred: message.labelIds?.includes("STARRED") || false,
    hasAttachments: parts(message).some((p) => Boolean(p.filename)),
  };
}
export function sanitizeEmailHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "div",
      "span",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "pre",
      "code",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
    },
    nonTextTags: [
      "script",
      "style",
      "textarea",
      "option",
      "iframe",
      "object",
      "noscript",
      "template",
    ],
  });
}
export function normalizeMessage(
  message: gmail_v1.Schema$Message,
): MailMessage {
  const attachments: MailAttachment[] = [],
    html: string[] = [],
    text: string[] = [];
  for (const part of parts(message)) {
    if (part.filename) {
      attachments.push({
        id: part.body?.attachmentId || "",
        partId: part.partId || "",
        filename: safeFilename(decodeHeader(part.filename)),
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body?.size || 0,
      });
      continue;
    }
    if (
      !part.body?.data ||
      !["text/html", "text/plain"].includes(part.mimeType || "")
    )
      continue;
    if (part.body.data.length > 3 * 1024 * 1024) {
      text.push("This email body is too large to display.");
      continue;
    }
    const contentType =
      part.headers?.find((h) => h.name?.toLowerCase() === "content-type")
        ?.value || "";
    const charset =
      contentType.match(/charset=["']?([^\s;"']+)/i)?.[1] || "utf-8";
    let body: string;
    const buffer = Buffer.from(part.body.data, "base64url");
    try {
      body = new TextDecoder(charset).decode(buffer);
    } catch {
      body = buffer.toString("utf8");
    }
    if (part.mimeType === "text/html") html.push(body);
    else text.push(body);
  }
  return {
    ...summary(message),
    replyTo: recipient(header(message, "Reply-To") || header(message, "From")),
    html: sanitizeEmailHtml(html.join("<hr>")),
    text: text.join("\n\n"),
    attachments,
    replyable: Boolean(
      header(message, "Message-ID") &&
      recipient(header(message, "Reply-To") || header(message, "From")),
    ),
  };
}
export function recipient(value: string) {
  if (/[\r\n]/.test(value) || value.length > 4000) return "";
  const parsed = addressparser(value, { flatten: true });
  return parsed.length === 1 &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(parsed[0].address)
    ? parsed[0].address
    : "";
}
export function messageIdentifier(value: string) {
  const result = value.match(/<[^<>\s\u0000-\u001f]+>/g) || [];
  if (!result.length)
    throw new ApiError(
      400,
      "This email does not contain a valid reply identifier.",
    );
  return result;
}
