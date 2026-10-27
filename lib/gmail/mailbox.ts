import "server-only";
import { z } from "zod";
import { ApiError } from "../api";
import { googleCall, googleOptions, mailboxClient } from "./client";
import { parts, summary, normalizeMessage, safeFilename } from "./mime";
import type { MailPage, MailThread } from "./contracts";
export const gmailId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,256}$/, "Invalid Gmail ID.");
const attachmentIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,4096}$/, "Invalid attachment ID.");
const listQuery = z.object({
  folder: z.enum(["inbox", "sent", "starred"]).default("inbox"),
  q: z.string().trim().max(300).default(""),
  pageToken: z
    .string()
    .max(2048)
    .regex(/^[^\u0000-\u001f\u007f]*$/)
    .optional(),
});
// Request the MIME structure and headers, never message body bytes on the list.
const partFields = (depth: number): string =>
  "partId,mimeType,filename,headers,body(attachmentId,size)" +
  (depth ? ",parts(" + partFields(depth - 1) + ")" : "");
const listFields =
  "id,threadId,labelIds,snippet,internalDate,payload(" + partFields(8) + ")";
export async function listMail(request: Request): Promise<MailPage> {
  const params = listQuery.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { api, ciphertext } = await mailboxClient();
  const result = await googleCall(
    () =>
      api.users.messages.list(
        {
          userId: "me",
          labelIds: [
            params.folder === "sent"
              ? "SENT"
              : params.folder === "starred"
                ? "STARRED"
                : "INBOX",
          ],
          q: params.q,
          maxResults: 25,
          pageToken: params.pageToken,
          fields: "messages(id,threadId),nextPageToken",
        },
        googleOptions,
      ),
    ciphertext,
  );
  const messages = result.data.messages || [];
  const items: ReturnType<typeof summary>[] = [];
  // Five requests at a time, rather than 25 simultaneous calls per admin.
  for (let i = 0; i < messages.length; i += 5) {
    const batch = await Promise.all(
      messages.slice(i, i + 5).map(async (item) => {
        try {
          return (
            await googleCall(
              () =>
                api.users.messages.get(
                  {
                    userId: "me",
                    id: item.id!,
                    format: "full",
                    fields: listFields,
                  },
                  googleOptions,
                ),
              ciphertext,
            )
          ).data;
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        }
      }),
    );
    for (const message of batch) if (message) items.push(summary(message));
  }
  return {
    items,
    ...(result.data.nextPageToken
      ? { nextPageToken: result.data.nextPageToken }
      : {}),
  };
}
export async function getMessage(id: string) {
  gmailId.parse(id);
  const { api, ciphertext } = await mailboxClient();
  return (
    await googleCall(
      () =>
        api.users.messages.get(
          { userId: "me", id, format: "full" },
          googleOptions,
        ),
      ciphertext,
    )
  ).data;
}
export async function getThread(id: string): Promise<MailThread> {
  gmailId.parse(id);
  const { api, ciphertext } = await mailboxClient();
  const result = await googleCall(
    () =>
      api.users.threads.get(
        { userId: "me", id, format: "full" },
        googleOptions,
      ),
    ciphertext,
  );
  return {
    id,
    messages: (result.data.messages || [])
      .sort((a, b) => Number(a.internalDate || 0) - Number(b.internalDate || 0))
      .map(normalizeMessage),
  };
}
export const labelAction = z
  .object({ action: z.enum(["read", "unread", "archive", "star", "unstar"]) })
  .strict();
export async function modifyMessage(
  id: string,
  action: z.infer<typeof labelAction>["action"],
) {
  gmailId.parse(id);
  const { api, ciphertext } = await mailboxClient();
  const addLabelIds =
    action === "unread" ? ["UNREAD"] : action === "star" ? ["STARRED"] : [];
  const removeLabelIds =
    action === "read"
      ? ["UNREAD"]
      : action === "archive"
        ? ["INBOX"]
        : action === "unstar"
          ? ["STARRED"]
          : [];
  await googleCall(
    () =>
      api.users.messages.modify(
        {
          userId: "me",
          id,
          requestBody: { addLabelIds, removeLabelIds },
          fields: "id",
        },
        googleOptions,
      ),
    ciphertext,
  );
}
export async function downloadAttachment(
  messageId: string,
  attachmentId: string,
  partId: string,
) {
  attachmentIdSchema.parse(attachmentId);
  const message = await getMessage(messageId);
  const part = parts(message).find(
    (p) =>
      p.partId === partId &&
      p.filename &&
      (p.body?.attachmentId || "inline") === attachmentId,
  );
  if (!part) throw new ApiError(404, "Attachment not found.");
  if ((part.body?.size || 0) > 25 * 1024 * 1024)
    throw new ApiError(
      413,
      "This attachment exceeds the 25 MB download limit.",
    );
  let data = part.body?.data;
  if (part.body?.attachmentId) {
    const { api, ciphertext } = await mailboxClient();
    data = (
      await googleCall(
        () =>
          api.users.messages.attachments.get(
            { userId: "me", messageId, id: attachmentId },
            googleOptions,
          ),
        ciphertext,
      )
    ).data.data;
  }
  if (!data || data.length > 36 * 1024 * 1024)
    throw new ApiError(413, "Attachment unavailable or too large.");
  const buffer = Buffer.from(data, "base64url");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition":
        "attachment; filename=attachment; filename*=UTF-8''" +
        encodeURIComponent(safeFilename(part.filename!)).replace(
          /['()*]/g,
          (c) => "%" + c.charCodeAt(0).toString(16),
        ),
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
