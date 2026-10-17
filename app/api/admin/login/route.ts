import { z } from "zod";
import {
  endpoint,
  body,
  checkOrigin,
  clientAddress,
  json,
  rateLimit,
  ApiError,
} from "@/lib/api";
import { Admin } from "@/lib/models";
import { emailSchema } from "@/lib/admin-validation";
import { createSession, deleteSession } from "@/lib/admin-auth";
import { verifyPassword, hashPassword } from "@/lib/passwords";

let dummyHash: Promise<string> | undefined;
export const POST = endpoint(async (request) => {
  checkOrigin(request);
  await rateLimit(`login-ip:${clientAddress(request)}`, 30, 900);
  const input = await body(
    request,
    z
      .object({ email: emailSchema, password: z.string().min(1).max(128) })
      .strict(),
  );
  await rateLimit(`login-email:${input.email}`, 10, 900);
  const admin = await Admin.findOne({ email: input.email }).select(
    "+passwordHash",
  );
  dummyHash ??= hashPassword("unavailable-account-dummy-value");
  const valid = await verifyPassword(
    input.password,
    admin?.passwordHash || (await dummyHash),
  );
  if (!admin || !valid) throw new ApiError(401, "Invalid email or password.");
  await deleteSession();
  await createSession(String(admin._id), admin.sessionVersion);
  return json({ message: "Signed in." });
});
