import "server-only";
import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../api";
import { encryptionConfigured } from "./crypto";
// gmail.modify already grants send, read and safe label changes; no redundant send scope.
export const gmailScopes = ["https://www.googleapis.com/auth/gmail.modify"];
export function gmailConfig() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } =
    process.env;
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!base || !clientId || !clientSecret || !encryptionConfigured())
    throw new ApiError(
      503,
      "Gmail is not configured. Complete the Google OAuth setup on the server.",
    );
  let origin: URL, redirect: URL;
  try {
    origin = new URL(base);
    redirect = new URL(
      process.env.GOOGLE_REDIRECT_URI || "/api/admin/gmail/callback",
      origin,
    );
  } catch {
    throw new ApiError(503, "Gmail callback configuration is invalid.");
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
      )) ||
    redirect.origin !== origin.origin ||
    redirect.pathname !== "/api/admin/gmail/callback" ||
    redirect.search ||
    redirect.hash
  )
    throw new ApiError(
      503,
      "Gmail callback must match the application origin and registered callback path.",
    );
  return {
    clientId,
    clientSecret,
    origin: origin.origin,
    redirectUri: redirect.href,
  };
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
