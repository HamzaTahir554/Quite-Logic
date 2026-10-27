import "server-only";
import { gmail } from "@googleapis/gmail";
import type { OAuth2Client } from "google-auth-library";
import { ApiError } from "../api";
import { connectDB } from "../mongodb";
import { GmailIntegration } from "./models";
import { decryptToken } from "./crypto";
import { gmailConfigurationError, oauthClient } from "./config";
import type { GmailStatus } from "./contracts";
let cached: { ciphertext: string; client: OAuth2Client } | undefined;
export async function mailboxClient() {
  await connectDB();
  const integration = await GmailIntegration.findOne({ key: "official" })
    .select("+encryptedRefreshToken")
    .lean();
  if (!integration || integration.status !== "connected")
    throw new ApiError(
      409,
      "Gmail connection expired or disconnected. Reconnect Gmail.",
      "GMAIL_RECONNECT",
    );
  const ciphertext = String(integration.encryptedRefreshToken);
  if (!cached || cached.ciphertext !== ciphertext) {
    const client = oauthClient();
    client.setCredentials({ refresh_token: decryptToken(ciphertext) });
    cached = { ciphertext, client };
  }
  return {
    api: gmail({ version: "v1", auth: cached.client }),
    accountEmail: String(integration.accountEmail),
    ciphertext,
  };
}
export function clearGmailClient() {
  cached = undefined;
}
export async function googleCall<T>(
  operation: () => Promise<T>,
  ciphertext?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const e = error as {
      response?: {
        status?: number;
        data?: { error?: string | { errors?: { reason?: string }[] } };
      };
      code?: string;
    };
    const status = e.response?.status;
    const detail = e.response?.data?.error;
    const reason =
      typeof detail === "object" ? detail.errors?.[0]?.reason : detail;
    if (
      status === 401 ||
      reason === "invalid_grant" ||
      reason === "insufficientPermissions"
    ) {
      if (ciphertext)
        await GmailIntegration.updateOne(
          { key: "official", encryptedRefreshToken: ciphertext },
          { $set: { status: "expired" } },
        );
      clearGmailClient();
      throw new ApiError(
        409,
        "Gmail connection expired. Reconnect Gmail.",
        "GMAIL_RECONNECT",
      );
    }
    if (status === 404)
      throw new ApiError(
        404,
        "This email or attachment is no longer available.",
      );
    if (
      status === 429 ||
      reason === "rateLimitExceeded" ||
      reason === "userRateLimitExceeded"
    )
      throw new ApiError(429, "Gmail is busy. Wait a moment and try again.");
    if (status === 403)
      throw new ApiError(
        503,
        "Gmail access is unavailable. Check Gmail API access and Google Cloud configuration.",
      );
    if (status === 400)
      throw new ApiError(
        400,
        "Gmail could not accept this request. Check the message details.",
      );
    throw new ApiError(
      502,
      "Gmail is temporarily unavailable. Please try again.",
    );
  }
}
export const googleOptions = { timeout: 12000, retry: false };
export async function gmailStatus(): Promise<GmailStatus> {
  const configurationError = gmailConfigurationError();
  if (configurationError)
    return {
      configured: false,
      connected: false,
      reconnect: false,
      unreadCount: 0,
      configurationError,
    };
  await connectDB();
  const integration = await GmailIntegration.findOne({
    key: "official",
  }).lean();
  if (!integration)
    return {
      configured: true,
      connected: false,
      reconnect: false,
      unreadCount: 0,
    };
  const base = {
    configured: true,
    accountEmail: String(integration.accountEmail),
    unreadCount: 0,
  };
  if (integration.status !== "connected")
    return { ...base, connected: false, reconnect: true };
  try {
    const { api, ciphertext } = await mailboxClient();
    const result = await googleCall(
      () =>
        api.users.labels.get(
          { userId: "me", id: "INBOX", fields: "messagesUnread" },
          googleOptions,
        ),
      ciphertext,
    );
    return {
      ...base,
      connected: true,
      reconnect: false,
      unreadCount: result.data.messagesUnread || 0,
    };
  } catch (error) {
    if (error instanceof ApiError && error.code === "GMAIL_RECONNECT")
      return { ...base, connected: false, reconnect: true };
    throw error;
  }
}
