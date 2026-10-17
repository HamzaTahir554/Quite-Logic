import nextEnv from "@next/env";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import {
  Admin,
  Session,
  Review,
  Project,
  ProjectImage,
  RateLimit,
} from "../lib/models";
import { emailSchema, passwordSchema } from "../lib/admin-validation";
import { hashPassword } from "../lib/passwords";
import { SetupError, setupErrorMessage } from "../lib/setup-errors";

nextEnv.loadEnvConfig(process.cwd());
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const prompt = createInterface({
  input: process.stdin,
  output,
  terminal: !!process.stdin.isTTY,
});
try {
  // Fail before requesting account details when the database is not ready.
  console.log("Checking MongoDB connection…");
  await connectDB();
  await Promise.all(
    [Admin, Session, Review, Project, ProjectImage, RateLimit].map((model) =>
      model.init(),
    ),
  );
  const email = emailSchema.parse(
    (await prompt.question("Admin email: ")).trim(),
  );
  if (await Admin.exists({ email }))
    throw new SetupError(
      "That admin account already exists. Use /admin/forgot-password to reset its password.",
    );
  process.stdout.write(
    "New password (12+ characters, upper/lowercase, number, symbol; hidden): ",
  );
  muted = true;
  const password = passwordSchema.parse(await prompt.question(""));
  muted = false;
  process.stdout.write("\n");
  await Admin.create({ email, passwordHash: await hashPassword(password) });
  console.log("Admin created. Sign in at /admin/login.");
} catch (error) {
  muted = false;
  process.stdout.write("\n");
  console.error("Setup failed:", setupErrorMessage(error));
  process.exitCode = 1;
} finally {
  prompt.close();
  await mongoose.disconnect();
}
