export type Mailbox = "inbox" | "sent" | "starred";
export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  reconnect: boolean;
  configurationError?: string;
  accountEmail?: string;
  unreadCount: number;
};
export type MailSummary = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
};
export type MailAttachment = {
  id: string;
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
};
export type MailMessage = MailSummary & {
  replyTo: string;
  html: string;
  text: string;
  attachments: MailAttachment[];
  replyable: boolean;
};
export type MailThread = { id: string; messages: MailMessage[] };
export type MailPage = { items: MailSummary[]; nextPageToken?: string };
export const attachmentLimit = 10 * 1024 * 1024;
export const totalAttachmentLimit = 15 * 1024 * 1024;
export const attachmentTypes: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};
