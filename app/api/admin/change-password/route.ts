import { cookies } from "next/headers";
import { z } from "zod";
import { database } from "@/lib/database";
import {
  apiError,
  hashPassword,
  HttpError,
  rateLimit,
  readJson,
  requireAdmin,
  sessionCookie,
  verifyPassword,
} from "@/lib/admin-security";
import { passwordPair } from "@/lib/passwords";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = passwordPair
      .safeExtend({ currentPassword: z.string().min(1).max(200) })
      .safeParse(await readJson(request));
    if (!input.success)
      throw new HttpError(
        400,
        "Check your current password and make sure the new passwords match and meet the password requirements.",
      );
    await rateLimit("change-password:" + admin.id, 5);
    if (input.data.password === input.data.currentPassword)
      throw new HttpError(400, "Choose a different new password.");
    const hash = await hashPassword(input.data.password);
    const connection = await database().connect();
    try {
      await connection.query("BEGIN");
      const result = await connection.query(
        "SELECT password_hash FROM admins WHERE id=$1 FOR UPDATE",
        [admin.id],
      );
      if (
        !(await verifyPassword(
          input.data.currentPassword,
          result.rows[0]?.password_hash,
        ))
      )
        throw new HttpError(400, "Your current password is incorrect.");
      await connection.query("UPDATE admins SET password_hash=$2 WHERE id=$1", [
        admin.id,
        hash,
      ]);
      await connection.query("DELETE FROM password_resets WHERE admin_id=$1", [
        admin.id,
      ]);
      await connection.query("DELETE FROM admin_sessions WHERE admin_id=$1", [
        admin.id,
      ]);
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
    (await cookies()).delete(sessionCookie);
    return Response.json(
      {
        message:
          "Password changed. All sessions have been signed out. Sign in with your new password.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
