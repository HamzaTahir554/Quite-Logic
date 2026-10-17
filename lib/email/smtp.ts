import "server-only";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { smtpOptions, smtpRetryIsSafe } from "./smtp-config.mjs";
import { mailbox } from "./config";

export class SmtpDeliveryError extends Error {
  constructor(public safeToRetry: boolean) {
    super("Email delivery could not be confirmed.");
  }
}
export async function sendSmtp(input: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}) {
  let options;
  try {
    options = smtpOptions();
  } catch {
    throw new SmtpDeliveryError(true);
  }
  const transport = nodemailer.createTransport(options);
  try {
    const messageId = input.idempotencyKey
      ? `<quiet-${createHash("sha256").update(input.idempotencyKey).digest("hex")}@${mailbox(input.from).split("@")[1]}>`
      : undefined;
    const { idempotencyKey: _key, ...mail } = input;
    const result = await transport.sendMail({
      ...mail,
      messageId,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (result.rejected.length) throw new SmtpDeliveryError(true);
    if (!result.accepted.length) throw new SmtpDeliveryError(false);
    return result.messageId;
  } catch (error) {
    const safe =
      error instanceof SmtpDeliveryError
        ? error.safeToRetry
        : smtpRetryIsSafe(error);
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        operation: "smtp.send",
        status: "failed",
        delivery: safe ? "not_accepted" : "uncertain",
      }),
    );
    throw new SmtpDeliveryError(safe);
  } finally {
    transport.close();
  }
}
