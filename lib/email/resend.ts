import "server-only";
import { Resend } from "resend";
import { emailConfig } from "./config";
import { messageTemplate } from "./templates";
import { sendSmtp } from "./smtp";

let client: Resend | undefined;
export function resendClient() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("Email provider is not configured.");
  return (client ??= new Resend(key));
}
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  reply?: boolean;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}) {
  const config = emailConfig();
  return sendSmtp({
    from: input.reply ? config.replyFrom : config.from,
    to: input.to,
    replyTo: input.replyTo || config.to,
    subject: input.subject,
    text: input.text,
    html: input.html || messageTemplate(input.subject, input.text),
    headers: input.headers,
    idempotencyKey: input.idempotencyKey,
  });
}
