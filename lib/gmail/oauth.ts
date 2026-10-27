import "server-only";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { gmail } from "@googleapis/gmail";
import { CodeChallengeMethod } from "google-auth-library";
import { ApiError } from "../api";
import { cookieName, requireAdmin } from "../admin-auth";
import { Admin, Session } from "../models";
import { randomToken, tokenHash } from "../passwords";
import { connectDB } from "../mongodb";
import { GmailIntegration, GmailOAuthState } from "./models";
import { encryptToken, decryptToken } from "./crypto";
import { gmailConfig, gmailScopes, oauthClient } from "./config";
import { clearGmailClient, googleCall, googleOptions } from "./client";
export const oauthCookie = "ql_gmail_oauth";
export async function beginGmailOAuth(request: Request) {
  await requireAdmin(request);
  const { origin } = gmailConfig();
  if (new URL(request.url).origin !== origin)
    throw new ApiError(
      403,
      "Open Admin on the configured application URL before connecting Gmail.",
    );
  const jar = await cookies(),
    session = jar.get(cookieName)?.value;
  if (!session) throw new ApiError(401, "Please sign in.");
  const state = randomToken(),
    verifier = randomToken();
  const prior = jar.get(oauthCookie)?.value;
  if (prior) await GmailOAuthState.deleteOne({ stateHash: tokenHash(prior) });
  await GmailOAuthState.create({
    stateHash: tokenHash(state),
    sessionHash: tokenHash(session),
    encryptedVerifier: encryptToken(verifier),
    expiresAt: new Date(Date.now() + 10 * 60000),
  });
  jar.set(oauthCookie, state, {
    httpOnly: true,
    secure: new URL(origin).protocol === "https:",
    sameSite: "lax",
    path: "/api/admin/gmail",
    maxAge: 600,
  });
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: gmailScopes,
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: CodeChallengeMethod.S256,
    ...(process.env.GMAIL_ACCOUNT_EMAIL
      ? { login_hint: process.env.GMAIL_ACCOUNT_EMAIL }
      : {}),
  });
}
export async function finishGmailOAuth(request: Request) {
  const query = new URL(request.url).searchParams,
    state = query.get("state") || "";
  const jar = await cookies(),
    saved = jar.get(oauthCookie)?.value || "";
  if (
    !/^[a-f0-9]{64}$/.test(state) ||
    saved.length !== state.length ||
    !timingSafeEqual(Buffer.from(saved), Buffer.from(state))
  )
    throw new ApiError(
      403,
      "Gmail authorization expired. Please connect again.",
    );
  jar.delete(oauthCookie);
  await connectDB();
  const pending = await GmailOAuthState.findOneAndDelete({
    stateHash: tokenHash(state),
    expiresAt: { $gt: new Date() },
  })
    .select("+encryptedVerifier")
    .lean();
  if (!pending)
    throw new ApiError(
      403,
      "Gmail authorization expired. Please connect again.",
    );
  // The existing admin cookie is SameSite=Strict, so Google cannot send it back.
  // Authorize this callback with the single-use browser-bound state AND the still-live original Mongo session.
  const session = await Session.findOne({
    tokenHash: pending.sessionHash,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (
    !session ||
    !(await Admin.exists({
      _id: session.adminId,
      sessionVersion: session.version,
    }))
  )
    throw new ApiError(401, "Please sign in again before connecting Gmail.");
  if (query.has("error")) return false;
  const code = query.get("code");
  if (!code || code.length > 4096)
    throw new ApiError(
      400,
      "Google authorization did not complete. Please try again.",
    );
  const client = oauthClient();
  const { tokens } = await googleCall(() =>
    client.getToken({
      code,
      codeVerifier: decryptToken(String(pending.encryptedVerifier)),
    }),
  );
  if (!tokens.access_token || !tokens.refresh_token)
    throw new ApiError(
      400,
      "Google did not grant offline access. Reconnect and grant the requested Gmail permission.",
    );
  const granted = (tokens.scope || "").split(" ");
  if (!gmailScopes.every((scope) => granted.includes(scope)))
    throw new ApiError(
      403,
      "Gmail permission was not granted. Reconnect and allow mailbox access.",
    );
  client.setCredentials(tokens);
  const profile = await googleCall(() =>
    gmail({ version: "v1", auth: client }).users.getProfile(
      { userId: "me", fields: "emailAddress" },
      googleOptions,
    ),
  );
  const email = profile.data.emailAddress?.toLowerCase();
  if (
    !email ||
    (process.env.GMAIL_ACCOUNT_EMAIL &&
      process.env.GMAIL_ACCOUNT_EMAIL.trim().toLowerCase() !== email)
  )
    throw new ApiError(
      403,
      "Choose the official mailbox configured for this website.",
    );
  await GmailIntegration.findOneAndUpdate(
    { key: "official" },
    {
      $set: {
        accountEmail: email,
        encryptedRefreshToken: encryptToken(tokens.refresh_token),
        scopes: granted,
        status: "connected",
        connectedAt: new Date(),
      },
    },
    { upsert: true },
  );
  clearGmailClient();
  return true;
}
export async function disconnectGmail() {
  await connectDB();
  const record = await GmailIntegration.findOne({ key: "official" })
    .select("+encryptedRefreshToken")
    .lean();
  let revoked = true;
  if (record) {
    try {
      await oauthClient().revokeToken(
        decryptToken(String(record.encryptedRefreshToken)),
      );
    } catch {
      revoked = false;
    }
    await GmailIntegration.deleteOne({
      _id: record._id,
      encryptedRefreshToken: record.encryptedRefreshToken,
    });
  }
  await GmailOAuthState.deleteMany({});
  clearGmailClient();
  return revoked;
}
