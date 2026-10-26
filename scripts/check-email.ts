import nextEnv from "@next/env";
import { verifyEmailConnection } from "../lib/email";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
  info() {},
  error() {},
});
const missing = [
  "SMTP_HOST",
  "SMTP_FROM",
  ...(process.env.SMTP_USER ? ["SMTP_PASSWORD"] : []),
].filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(
    `Email configuration incomplete: ${missing.join(", ")}. Add the missing values to your local environment.`,
  );
  process.exitCode = 1;
} else {
  try {
    await verifyEmailConnection();
    console.log(
      "SMTP connection, TLS and authentication verified. No email was sent.",
    );
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      /^[A-Z0-9_]+$/.test(error.code)
        ? error.code
        : "CONNECTION_FAILED";
    console.error(
      `SMTP verification failed (${code}). Check the SMTP settings and app password. No email was sent.`,
    );
    process.exitCode = 1;
  }
}
