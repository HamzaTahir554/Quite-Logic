import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { database } from "@/lib/database";
import {
  apiError,
  digest,
  rateLimit,
  readJson,
  HttpError,
} from "@/lib/admin-security";
import { emailReady } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/resend";
export const runtime = "nodejs";
export const maxDuration = 60;
const generic = () =>
  Response.json(
    {
      message:
        "If this email belongs to an admin, a password-reset link will be sent shortly. Check your inbox and spam folder.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const input = z
      .object({ email: z.email().max(254) })
      .safeParse(await readJson(request));
    if (!input.success)
      throw new HttpError(400, "Please enter a valid email address.");
    const email = input.data.email.toLowerCase();
    after(async () => {
      try {
        await rateLimit("reset:global", 30, 3600);
        await rateLimit("reset:" + email, 3, 3600);
        const result = await database().query(
          "SELECT id FROM admins WHERE email=$1",
          [email],
        );
        if (result.rows[0] && emailReady()) {
          // Never build reset links from Host or forwarded request headers.
          const url = new URL(
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          );
          if (
            url.protocol !== "https:" &&
            !["localhost", "127.0.0.1"].includes(url.hostname)
          )
            throw new Error("Configure HTTPS site URL");
          const token = randomBytes(32).toString("hex");
          await database().query(
            "DELETE FROM password_resets WHERE expires_at<=now()",
          );
          await database().query(
            "INSERT INTO password_resets(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
            [digest(token), result.rows[0].id],
          );
          // Fragment keeps the raw token out of server access logs and referrers.
          const link = new URL("/admin/reset-password", url.origin);
          link.hash = `token=${token}`;
          try {
            await sendEmail({
              to: email,
              subject: "Reset your Quite Logic admin password",
              text: `Use this one-time link within 30 minutes to reset your password:\n\n${link.toString()}\n\nIf you did not request this, you can ignore this email. Your password has not changed.`,
            });
          } catch {
            await database().query(
              "DELETE FROM password_resets WHERE token_hash=$1",
              [digest(token)],
            );
            console.error("Password-reset email delivery failed.");
          }
        }
      } catch {
        console.error(
          "Password recovery could not complete. Check server configuration.",
        );
      }
    });
    // A shared minimum response time reduces account enumeration via fast paths.
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 1200 - (Date.now() - started))),
    );
    return generic();
  } catch (error) {
    return apiError(error);
  }
}
