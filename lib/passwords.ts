import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [method, salt, encoded] = hash.split("$");
  if (method !== "scrypt" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "hex"),
    actual = await derive(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
