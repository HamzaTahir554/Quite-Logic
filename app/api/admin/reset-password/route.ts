import { z } from "zod";
import {
  endpoint,
  checkOrigin,
  body,
  clientAddress,
  json,
  rateLimit,
  ApiError,
} from "@/lib/api";
import { newPasswordSchema } from "@/lib/admin-validation";
import { Admin, Session } from "@/lib/models";
import { hashPassword, tokenHash } from "@/lib/passwords";

export const POST = endpoint(async (request) => {
  checkOrigin(request);
  await rateLimit(`reset-ip:${clientAddress(request)}`, 20, 900);
  const { token, password } = await body(
    request,
    newPasswordSchema.and(
      z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }),
    ),
  );
  const filter = {
    resetTokenHash: tokenHash(token),
    resetExpires: { $gt: new Date() },
  };
  if (!(await Admin.exists(filter)))
    throw new ApiError(400, "This reset link is invalid or expired.");
  const passwordHash = await hashPassword(password);
  // Atomic consume: simultaneous reset attempts can only succeed once.
  const admin = await Admin.findOneAndUpdate(filter, {
    $set: { passwordHash },
    $inc: { sessionVersion: 1 },
    $unset: { resetTokenHash: 1, resetExpires: 1 },
  });
  if (!admin) throw new ApiError(400, "This reset link is invalid or expired.");
  await Session.deleteMany({ adminId: admin._id });
  return json({ message: "Password reset. Sign in with your new password." });
});
