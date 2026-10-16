import "server-only";
import nodemailer from "nodemailer";
import { contactEmail } from "./company";
export function gmailReady() {
  return !!process.env.GMAIL_APP_PASSWORD;
}
export async function sendGmail(
  to: string,
  subject: string,
  text: string,
  replyTo?: string,
) {
  if (!gmailReady()) throw new Error("Gmail sending is not configured.");
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: contactEmail,
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, ""),
    },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    return await transport.sendMail({
      from: { name: "Quite Logic", address: contactEmail },
      to,
      replyTo,
      subject,
      text,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } finally {
    transport.close();
  }
}
