import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Admin, Session } from "./models";
import { connectDB } from "./mongodb";
import { randomToken, tokenHash } from "./passwords";
import { ApiError, checkOrigin } from "./api";
import { cache } from "react";

export const cookieName = "ql_admin_session";
export const currentAdmin = cache(async () => {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await connectDB();
  const session = await Session.findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  return Admin.findOne({
    _id: session.adminId,
    sessionVersion: session.version,
  })
    .select("email sessionVersion avatarUrl")
    .lean();
});
export async function requireAdmin(request?: Request) {
  if (request && request.method !== "GET") checkOrigin(request);
  const admin = await currentAdmin();
  if (!admin) throw new ApiError(401, "Please sign in.");
  return admin;
}
export async function requireAdminPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
export async function createSession(adminId: string, version: number) {
  const token = randomToken(),
    expires = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await Session.create({
    adminId,
    version,
    tokenHash: tokenHash(token),
    expiresAt: expires,
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires,
  });
}
export async function deleteSession() {
  const jar = await cookies(),
    token = jar.get(cookieName)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: tokenHash(token) });
  }
  jar.delete(cookieName);
}
