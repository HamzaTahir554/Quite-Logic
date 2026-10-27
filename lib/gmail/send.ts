import "server-only";
import { z } from "zod";
import { createHash } from "node:crypto";
import MailComposer from "nodemailer/lib/mail-composer";
import { ApiError } from "../api";
import { GmailSendReceipt } from "./models";
import { gmailId, getMessage } from "./mailbox";
import {
  header,
  decodeHeader,
  recipient,
  messageIdentifier,
  safeFilename,
} from "./mime";
import { googleCall, googleOptions, mailboxClient } from "./client";
import {
  attachmentLimit,
  totalAttachmentLimit,
  attachmentTypes,
} from "./contracts";
const addressList = z
  .string()
  .max(3000)
  .refine((v) => !/[\r\n]/.test(v), "Invalid recipients.")
  .transform((v) =>
    v
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.email()).max(20));
const inputSchema = z.object({
  requestId: z.uuid(),
  to: addressList,
  cc: addressList,
  bcc: addressList,
  subject: z
    .string()
    .trim()
    .max(250)
    .refine((v) => !/[\r\n]/.test(v), "Invalid subject."),
  body: z.string().trim().min(1, "Enter a message.").max(100000),
  messageId: gmailId.optional(),
});
export type OutgoingAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};
export function validateAttachment(
  filename: string,
  contentType: string,
  data: Buffer,
): OutgoingAttachment {
  if (!data.length || data.length > attachmentLimit)
    throw new ApiError(
      413,
      "Each attachment must be between 1 byte and 10 MB.",
    );
  const ext = filename.split(".").pop()?.toLowerCase() || "",
    expected = attachmentTypes[ext];
  if (
    !expected ||
    (contentType &&
      contentType !== "application/octet-stream" &&
      contentType !== expected)
  )
    throw new ApiError(400, "Use PDF, DOCX, XLSX, PNG or JPG attachments.");
  const valid =
    ext === "pdf"
      ? data.subarray(0, 5).toString() === "%PDF-"
      : ext === "png"
        ? data
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : ["jpg", "jpeg"].includes(ext)
          ? data[0] === 255 && data[1] === 216 && data[2] === 255
          : data.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])) &&
            data.includes(Buffer.from("[Content_Types].xml")) &&
            data.includes(Buffer.from(ext === "docx" ? "word/" : "xl/"));
  if (!valid)
    throw new ApiError(
      400,
      "An attachment does not match its declared file type.",
    );
  return {
    filename: safeFilename(filename),
    contentType: expected,
    content: data,
  };
}
export async function parseOutgoing(request: Request, reply: boolean) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new ApiError(415, "Send the message as multipart form data.");
  const max = totalAttachmentLimit + 256 * 1024;
  if (Number(request.headers.get("content-length")) > max)
    throw new ApiError(413, "Attachments must total 15 MB or less.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Message is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(413, "Attachments must total 15 MB or less.");
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new ApiError(400, "Could not read the message or attachments.");
  }
  const known = new Set([
    "requestId",
    "body",
    "attachments",
    ...(reply ? ["messageId"] : ["to", "cc", "bcc", "subject"]),
  ]);
  for (const name of form.keys())
    if (
      !known.has(name) ||
      (name !== "attachments" && form.getAll(name).length !== 1)
    )
      throw new ApiError(400, "Invalid message fields.");
  const field = (name: string) => {
    const value = form.get(name);
    if (value !== null && typeof value !== "string")
      throw new ApiError(400, "Invalid message fields.");
    return value || "";
  };
  const input = inputSchema.parse({
    requestId: field("requestId"),
    body: field("body"),
    to: reply ? "" : field("to"),
    cc: reply ? "" : field("cc"),
    bcc: reply ? "" : field("bcc"),
    subject: reply ? "" : field("subject"),
    ...(reply ? { messageId: field("messageId") } : {}),
  });
  if (!reply && (!input.to.length || !input.subject))
    throw new ApiError(400, "Recipient and subject are required.");
  const files = form.getAll("attachments");
  if (files.length > 5) throw new ApiError(400, "Attach up to five files.");
  const attachments: OutgoingAttachment[] = [];
  let total = 0;
  for (const file of files) {
    if (!(file instanceof File)) throw new ApiError(400, "Invalid attachment.");
    total += file.size;
    if (total > totalAttachmentLimit)
      throw new ApiError(413, "Attachments must total 15 MB or less.");
    attachments.push(
      validateAttachment(
        file.name,
        file.type,
        Buffer.from(await file.arrayBuffer()),
      ),
    );
  }
  return { input, attachments };
}
export async function sendMail(request: Request, reply: boolean) {
  const { input, attachments } = await parseOutgoing(request, reply);
  const { api, accountEmail, ciphertext } = await mailboxClient();
  await GmailSendReceipt.init();
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ input, accountEmail }))
    .update(
      Buffer.concat(
        attachments.map((a) =>
          Buffer.from(
            a.filename +
              a.contentType +
              createHash("sha256").update(a.content).digest("hex"),
          ),
        ),
      ),
    )
    .digest("hex");
  const existing = await GmailSendReceipt.findOne({
    requestId: input.requestId,
  }).lean();
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new ApiError(
        409,
        "This send request belongs to a different message.",
      );
    if (existing.state === "sent")
      return { id: existing.messageId, threadId: existing.threadId };
    throw new ApiError(
      409,
      "This message may already have been sent. Refresh Sent before creating another message.",
      "GMAIL_SEND_UNCERTAIN",
    );
  }
  let to = input.to,
    subject = input.subject,
    threadId: string | undefined,
    inReplyTo: string | undefined,
    references: string[] | undefined;
  if (reply) {
    const original = await getMessage(input.messageId!);
    const target = recipient(
      header(original, "Reply-To") || header(original, "From"),
    );
    if (!target || target.toLowerCase() === accountEmail.toLowerCase())
      throw new ApiError(400, "Choose an incoming message to reply to.");
    to = [target];
    threadId = original.threadId || undefined;
    const originalId = messageIdentifier(header(original, "Message-ID"))[0]!;
    inReplyTo = originalId;
    const previous =
      header(original, "References").match(/<[^<>\s\u0000-\u001f]+>/g) || [];
    references = [...new Set([...previous.slice(-30), originalId])];
    subject = decodeHeader(header(original, "Subject"))
      .replace(/[\r\n]+/g, " ")
      .slice(0, 998);
    if (!/^re:/i.test(subject)) subject = "Re: " + subject;
    if (!threadId) throw new ApiError(400, "This message cannot be threaded.");
  }
  const composer = new MailComposer({
    from: accountEmail,
    to,
    cc: input.cc,
    bcc: input.bcc,
    subject,
    text: input.body,
    attachments,
    ...(inReplyTo ? { inReplyTo, references } : {}),
    messageId:
      "<ql-" + input.requestId + "@" + accountEmail.split("@")[1] + ">",
    disableFileAccess: true,
    disableUrlAccess: true,
  }).compile();
  composer.keepBcc = true;
  const raw = (await composer.build()).toString("base64url");
  try {
    await GmailSendReceipt.create({
      requestId: input.requestId,
      fingerprint,
      accountEmail,
      state: "submitting",
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new ApiError(
        409,
        "This message is already being sent.",
        "GMAIL_SEND_UNCERTAIN",
      );
    throw error;
  }
  try {
    const result = await googleCall(
      () =>
        api.users.messages.send(
          {
            userId: "me",
            requestBody: { raw, ...(threadId ? { threadId } : {}) },
            fields: "id,threadId",
          },
          googleOptions,
        ),
      ciphertext,
    );
    if (!result.data.id)
      throw new ApiError(502, "Gmail did not confirm sending.");
    await GmailSendReceipt.updateOne(
      { requestId: input.requestId },
      {
        $set: {
          state: "sent",
          messageId: result.data.id,
          threadId: result.data.threadId,
        },
      },
    );
    return { id: result.data.id, threadId: result.data.threadId };
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      await GmailSendReceipt.deleteOne({ requestId: input.requestId });
      throw error;
    }
    await GmailSendReceipt.updateOne(
      { requestId: input.requestId },
      { $set: { state: "uncertain" } },
    );
    throw new ApiError(
      502,
      "Sending could not be confirmed. Check Sent before trying again; this message will not be automatically resent.",
      "GMAIL_SEND_UNCERTAIN",
    );
  }
}
