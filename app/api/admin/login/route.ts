import { z } from "zod";
import { cookies } from "next/headers";
import { database } from "@/lib/database";
import {
  apiError,
  createSession,
  digest,
  HttpError,
  rateLimit,
  readJson,
  sessionCookie,
  verifyPassword,
} from "@/lib/admin-security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const parsed = z
      .object({
        email: z.email().max(254),
        password: z.string().min(1).max(200),
      })
      .safeParse(await readJson(request));
    if (!parsed.success)
      throw new HttpError(400, "Enter your admin email and password.");
    const email = parsed.data.email.trim().toLowerCase();
    await rateLimit("login:global", 60);
    await rateLimit("login:" + email, 8);
    const { rows } = await database().query(
      "SELECT id,password_hash FROM admins WHERE email=$1",
      [email],
    );
    if (!(await verifyPassword(parsed.data.password, rows[0]?.password_hash)))
      throw new HttpError(401, "Email or password is incorrect.");
    const previous = (await cookies()).get(sessionCookie)?.value;
    if (previous)
      await database().query("DELETE FROM admin_sessions WHERE token_hash=$1", [
        digest(previous),
      ]);
    await createSession(rows[0].id);
    return Response.json(
      { message: "Signed in." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
