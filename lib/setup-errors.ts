import { ZodError } from "zod";

/** Only trusted diagnostics are printed; raw driver messages may contain URIs. */
export class SetupError extends Error {}

export function setupErrorMessage(error: unknown): string {
  if (error instanceof SetupError) return error.message;
  if (error instanceof ZodError)
    return error.issues[0]?.message || "Invalid input.";
  if (error && typeof error === "object") {
    const code = "code" in error ? error.code : undefined;
    const name = "name" in error ? error.name : undefined;
    if (code === 11000)
      return "That admin account already exists. Use /admin/forgot-password to reset its password.";
    if (code === 18 || name === "MongoAuthenticationError")
      return "MongoDB authentication failed. Check the database username and password in MONGODB_URI. URL-encode special characters in the password.";
    if (code === 13)
      return "The MongoDB user lacks permission. Grant access to the application database and permission to create indexes.";
    if (name === "MongoParseError")
      return "MONGODB_URI is invalid. Copy the application connection string from Atlas and include the database name.";
    if (
      typeof name === "string" &&
      /ServerSelection|Network|DNS|Timeout/.test(name)
    )
      return "Cannot reach MongoDB. Check the connection string, Atlas cluster availability, Network Access IP allowlist, and DNS/network connectivity.";
  }
  return "Setup failed unexpectedly. Check MongoDB configuration and database permissions. No credentials were printed.";
}
