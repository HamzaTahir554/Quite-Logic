import "server-only";
import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../api";
import { encryptionConfigured } from "./crypto";
// gmail.modify already grants send, read and safe label changes; no redundant send scope.
export const gmailScopes = ["https://www.googleapis.com/auth/gmail.modify"];
export function gmailConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const base = (
    process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  )?.trim();
  const callback = process.env.GOOGLE_REDIRECT_URI?.trim();
  const missing = [
    ...(!base ? ["APP_URL"] : []),
    ...(!clientId ? ["GOOGLE_CLIENT_ID"] : []),
    ...(!clientSecret ? ["GOOGLE_CLIENT_SECRET"] : []),
    ...(!process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim()
      ? ["GMAIL_TOKEN_ENCRYPTION_KEY"]
      : []),
  ];
  if (missing.length)
    throw new ApiError(
      503,
      `The running server is missing: ${missing.join(", ")}. Apply the environment changes and restart the application.`,
    );
  for (const [name, value] of [
    ["APP_URL", base],
    ["GOOGLE_CLIENT_ID", clientId],
    ["GOOGLE_CLIENT_SECRET", clientSecret],
    ["GOOGLE_REDIRECT_URI", callback],
    [
      "GMAIL_TOKEN_ENCRYPTION_KEY",
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim(),
    ],
  ]) {
    if (value?.startsWith(name + "="))
      throw new ApiError(
        503,
        `${name} repeats its variable name. Enter only the value, without ${name}=, in Hostinger's Value field.`,
      );
    if (value && (/^["']/.test(value) || /["']$/.test(value)))
      throw new ApiError(
        503,
        `${name} has surrounding quotes. Remove the quotes in Hostinger's Value field.`,
      );
  }
  if (!encryptionConfigured())
    throw new ApiError(
      503,
      "GMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key (44 characters, ending in =). Use the existing valid key; do not generate a new one for an already connected mailbox.",
    );
  let origin: URL, redirect: URL;
  try {
    origin = new URL(base!);
    redirect = new URL(callback || "/api/admin/gmail/callback", origin);
  } catch {
    throw new ApiError(
      503,
      "APP_URL or GOOGLE_REDIRECT_URI is not a valid URL. Enter the URL only, without a variable-name prefix.",
    );
  }
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    (origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      ))
  )
    throw new ApiError(
      503,
      "APP_URL must be the website origin only (HTTPS for the live site), without a page path, credentials or query string.",
    );
  if (
    redirect.origin !== origin.origin ||
    redirect.pathname !== "/api/admin/gmail/callback" ||
    redirect.search ||
    redirect.hash
  )
    throw new ApiError(
      503,
      "GOOGLE_REDIRECT_URI must use the same origin as APP_URL and the exact path /api/admin/gmail/callback. Check https and www match, with no trailing slash or query string.",
    );
  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    origin: origin.origin,
    redirectUri: redirect.href,
  };
}
/** Only fixed validation messages reach the authenticated Admin; never env values. */
export function gmailConfigurationError() {
  try {
    gmailConfig();
    return undefined;
  } catch (error) {
    return error instanceof ApiError
      ? error.message
      : "The server could not validate Gmail configuration.";
  }
}
export function configured() {
  try {
    gmailConfig();
    return true;
  } catch {
    return false;
  }
}
export function oauthClient() {
  const c = gmailConfig();
  return new OAuth2Client({
    clientId: c.clientId,
    clientSecret: c.clientSecret,
    redirectUri: c.redirectUri,
    transporterOptions: { timeout: 12000, retry: false },
  });
}
