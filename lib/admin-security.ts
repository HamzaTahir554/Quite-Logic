import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { database } from "./database";

export const sessionCookie = "quite_admin";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminSession() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token) || !process.env.DATABASE_URL)
    return null;
  const { rows } = await database().query(
    "SELECT a.id,a.email FROM admin_sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [digest(token)],
  );
  return rows[0] as { id: string; email: string } | undefined;
}
export async function requireAdmin() {
  const admin = await adminSession();
  if (!admin) throw new HttpError(401, "Please sign in to continue.");
  return admin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url).origin;
  if (
    !origin ||
    (origin !== expected &&
      origin !== process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""))
  )
    throw new HttpError(403, "This request is not allowed.");
}
export async function readJson(request: Request, max = 20000) {
  sameOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Please submit JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) {
        await reader.cancel();
        throw new HttpError(413, "Submission is too large.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Please check your submission.");
  }
}
export async function rateLimit(key: string, maximum: number, seconds = 900) {
  // Atomic shared counters work across serverless instances. Only hashes are stored.
  const { rows } = await database().query(
    `INSERT INTO request_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second')
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN request_limits.expires_at<=now() THEN 1 ELSE request_limits.hits+1 END,
    expires_at=CASE WHEN request_limits.expires_at<=now() THEN excluded.expires_at ELSE request_limits.expires_at END RETURNING hits`,
    [digest(key), seconds],
  );
  if (rows[0].hits > maximum)
    throw new HttpError(429, "Too many attempts. Please try again later.");
  await database().query(
    "DELETE FROM request_limits WHERE expires_at<now()-interval '1 day'",
  );
}
export async function verifyPassword(password: string, stored?: string) {
  const [salt, expected] = (
    stored || "00000000000000000000000000000000:" + "0".repeat(128)
  ).split(":");
  const actual = (await promisify(scrypt)(password, salt, 64)) as Buffer;
  const compare = Buffer.from(expected, "hex");
  return (
    compare.length === actual.length &&
    timingSafeEqual(actual, compare) &&
    !!stored
  );
}
export async function createSession(adminId: string) {
  const token = randomBytes(32).toString("hex");
  await database().query("DELETE FROM admin_sessions WHERE expires_at<=now()");
  await database().query(
    "INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
    [digest(token), adminId],
  );
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 28800,
  });
}
export function apiError(error: unknown) {
  return Response.json(
    {
      message:
        error instanceof HttpError
          ? error.message
          : "This service is temporarily unavailable. Please try again shortly.",
    },
    {
      status: error instanceof HttpError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
