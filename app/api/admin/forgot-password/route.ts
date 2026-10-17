import { z } from "zod";
import {
  endpoint,
  checkOrigin,
  body,
  clientAddress,
  json,
  rateLimit,
} from "@/lib/api";
import { emailSchema } from "@/lib/admin-validation";
import { Admin } from "@/lib/models";
import { randomToken, tokenHash } from "@/lib/passwords";
import { sendPasswordReset } from "@/lib/email";

export const POST = endpoint(async (request) => {
  checkOrigin(request);
  await rateLimit(`forgot-ip:${clientAddress(request)}`, 20, 3600);
  const { email } = await body(
    request,
    z.object({ email: emailSchema }).strict(),
  );
  await rateLimit(`forgot-email:${email}`, 3, 3600);
  const token = randomToken(),
    hash = tokenHash(token);
  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      $set: {
        resetTokenHash: hash,
        resetExpires: new Date(Date.now() + 30 * 60 * 1000),
      },
    },
  );
  if (admin) {
    try {
      await sendPasswordReset(email, token);
    } catch {
      await Admin.updateOne(
        { _id: admin._id, resetTokenHash: hash },
        { $unset: { resetTokenHash: 1, resetExpires: 1 } },
      );
      console.error(
        "Password reset email delivery failed. Check SMTP configuration.",
      );
    }
  }
  return json({
    message:
      "If an account exists for this email, a password reset link has been sent.",
  });
});
