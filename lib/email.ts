import "server-only";
import nodemailer from "nodemailer";

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
export async function sendPasswordReset(email: string, token: string) {
  const base = process.env.APP_URL;
  if (!base || !process.env.SMTP_HOST || !process.env.SMTP_FROM)
    throw new Error("Reset email is not configured.");
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
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  const link = new URL("/admin/reset-password", origin);
  link.searchParams.set("token", token);
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset your Quite Logic admin password",
    text: `A password reset was requested for your Quite Logic admin account.\n\n${link}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this email.`,
  });
}
