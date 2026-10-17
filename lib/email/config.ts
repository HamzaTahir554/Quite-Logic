import "server-only";
import { z } from "zod";
import { contactEmail } from "../company";
import { smtpOptions } from "./smtp-config.mjs";

export function mailbox(value: string) {
  const match = value.match(/^(?:[^<>\r\n]*<)?([^<>\s]+@[^<>\s]+)>?$/);
  const email = match?.[1]?.toLowerCase();
  if (!email || !z.email().safeParse(email).success || /[\r\n]/.test(value))
    throw new Error("Invalid server email configuration.");
  return email;
}
export function emailConfig() {
  const from = process.env.EMAIL_FROM || `Quiet Logic <${contactEmail}>`;
  const to = process.env.EMAIL_TO || contactEmail;
  const replyFrom =
    process.env.EMAIL_REPLY_FROM || `Quiet Logic <${contactEmail}>`;
  mailbox(from);
  mailbox(replyFrom);
  mailbox(to);
  return { from, to: mailbox(to), replyFrom };
}
export function emailReady() {
  try {
    emailConfig();
    smtpOptions();
    return true;
  } catch {
    return false;
  }
}
