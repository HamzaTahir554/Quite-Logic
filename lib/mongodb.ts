import mongoose from "mongoose";
import { SetupError } from "./setup-errors";

const state = globalThis as typeof globalThis & {
  mongoPromise?: Promise<typeof mongoose>;
};

/** One pool per Node process, including during Next.js development reloads. */
export async function connectDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri)
    throw new SetupError(
      "MONGODB_URI is missing. Add your MongoDB Atlas connection string to .env.local, then run npm run db:check.",
    );
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri) || /[<>]/.test(uri))
    throw new SetupError(
      "MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string with all placeholders replaced.",
    );
  if (mongoose.connection.readyState === 0) state.mongoPromise = undefined;
  if (!state.mongoPromise) {
    state.mongoPromise = mongoose
      .connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        bufferCommands: false,
      })
      .catch((error: unknown) => {
        state.mongoPromise = undefined;
        throw error;
      });
  }
  return state.mongoPromise;
}
