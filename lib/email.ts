import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";
import { contactEmail } from "./company";
import type { ContactInput } from "./contact";
import { contactMessage } from "./contact-message";

let transport:
  Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options> | undefined;
function mailTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
    throw new Error("Email is not configured.");
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transport;
}

export async function verifyEmailConnection() {
  await mailTransport().verify();
}

export async function sendContactInquiry(input: ContactInput) {
  const recipient = process.env.CONTACT_TO?.trim() || contactEmail;
  if (!z.email().safeParse(recipient).success)
    throw new Error("Contact recipient is not configured correctly.");
  const result = await mailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    replyTo: { address: input.email },
    ...contactMessage(input),
  });
  if (
    !result.accepted?.some(
      (address) => address.toLowerCase() === recipient.toLowerCase(),
    )
  )
    throw new Error("Contact message was not accepted.");
}

export async function sendPasswordReset(email: string, token: string) {
  const base = process.env.APP_URL;
  if (!base) throw new Error("Reset email is not configured.");
  const origin = new URL(base);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    origin.hostname,
  );
  if (
    process.env.NODE_ENV === "production" &&
    origin.protocol !== "https:" &&
    !loopback
  )
    throw new Error("HTTPS is required.");
  const link = new URL("/admin/reset-password", origin);
  link.searchParams.set("token", token);
  await mailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset your Quite Logic admin password",
    text: `A password reset was requested for your Quite Logic admin account.\n\n${link}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this email.`,
  });
}
