import { z } from "zod";
import { endpoint, body, json, rateLimit, ApiError } from "@/lib/api";
import { requireAdmin, deleteSession } from "@/lib/admin-auth";
import { newPasswordSchema } from "@/lib/admin-validation";
import { Admin, Session } from "@/lib/models";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export const POST = endpoint(async (request) => {
  const session = await requireAdmin(request);
  await rateLimit(`password:${session._id}`, 10, 900);
  const input = await body(
    request,
    newPasswordSchema.and(
      z.object({ currentPassword: z.string().min(1).max(128) }),
    ),
  );
  const admin = await Admin.findById(session._id).select("+passwordHash");
  if (
    !admin ||
    !(await verifyPassword(input.currentPassword, admin.passwordHash))
  )
    throw new ApiError(400, "Current password is incorrect.");
  if (input.password === input.currentPassword)
    throw new ApiError(400, "Choose a different password.");
  const changed = await Admin.updateOne(
    { _id: admin._id, sessionVersion: session.sessionVersion },
    {
      $set: { passwordHash: await hashPassword(input.password) },
      $inc: { sessionVersion: 1 },
      $unset: { resetTokenHash: 1, resetExpires: 1 },
    },
  );
  if (!changed.modifiedCount)
    throw new ApiError(409, "Your account changed. Please sign in again.");
  await Session.deleteMany({ adminId: admin._id });
  await deleteSession();
  return json({
    message:
      "Password changed. All sessions have been signed out. Sign in again.",
  });
});
