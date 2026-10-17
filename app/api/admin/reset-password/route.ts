import { cookies } from "next/headers";
import { z } from "zod";
import { database } from "@/lib/database";
import {
  apiError,
  digest,
  hashPassword,
  HttpError,
  rateLimit,
  readJson,
  sessionCookie,
} from "@/lib/admin-security";
import { passwordPair } from "@/lib/passwords";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = passwordPair
      .safeExtend({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .safeParse(await readJson(request));
    if (!input.success)
      throw new HttpError(
        400,
        "Check your reset link and make sure the new passwords match and meet the password requirements.",
      );
    await rateLimit("reset-use:global", 60);
    await rateLimit("reset-use:" + input.data.token, 5);
    const hash = await hashPassword(input.data.password);
    const connection = await database().connect();
    try {
      await connection.query("BEGIN");
      const found = await connection.query(
        "SELECT admin_id FROM password_resets WHERE token_hash=$1 AND expires_at>now()",
        [digest(input.data.token)],
      );
      if (!found.rows[0])
        throw new HttpError(
          400,
          "This reset link has expired or was already used. Please request a new one.",
        );
      const id = found.rows[0].admin_id;
      // Serialize all password changes for an account, then consume the token.
      await connection.query("SELECT id FROM admins WHERE id=$1 FOR UPDATE", [
        id,
      ]);
      const consumed = await connection.query(
        "DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>now() RETURNING admin_id",
        [digest(input.data.token)],
      );
      if (!consumed.rowCount)
        throw new HttpError(
          400,
          "This reset link has expired or was already used. Please request a new one.",
        );
      await connection.query("UPDATE admins SET password_hash=$2 WHERE id=$1", [
        id,
        hash,
      ]);
      await connection.query("DELETE FROM password_resets WHERE admin_id=$1", [
        id,
      ]);
      await connection.query("DELETE FROM admin_sessions WHERE admin_id=$1", [
        id,
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
          "Your password has been reset. Sign in with your new password.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
