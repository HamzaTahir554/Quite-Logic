import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ApiError } from "../api";
function key() {
  const value = process.env.GMAIL_TOKEN_ENCRYPTION_KEY || "";
  const bytes = Buffer.from(value, "base64");
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value) || bytes.length !== 32)
    throw new ApiError(503, "Gmail token encryption is not configured.");
  return bytes;
}
export function encryptToken(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("quietlogic:gmail:v1"));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}
export function decryptToken(value: string) {
  try {
    const [version, iv, tag, data, extra] = value.split(".");
    if (version !== "v1" || !iv || !tag || !data || extra) throw new Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from("quietlogic:gmail:v1"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ApiError(
      503,
      "Gmail credentials could not be unlocked. Check the server encryption key.",
    );
  }
}
export function encryptionConfigured() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}
