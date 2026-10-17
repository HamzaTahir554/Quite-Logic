import nextEnv from "@next/env";
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import { setupErrorMessage } from "../lib/setup-errors";

nextEnv.loadEnvConfig(process.cwd());
try {
  await connectDB();
  await mongoose.connection.db!.command({ ping: 1 });
  console.log(
    "MongoDB connection successful. You can now run npm run admin:create.",
  );
} catch (error) {
  console.error("Database check failed:", setupErrorMessage(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
