import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { RateLimit } from "./models";
import { connectDB } from "./mongodb";
import { tokenHash } from "./passwords";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function endpoint(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return json(
          { error: error.issues[0]?.message || "Invalid input." },
          400,
        );
      if (error instanceof SyntaxError)
        return json({ error: "Invalid JSON." }, 400);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      )
        return json({ error: "That slug is already in use." }, 409);
      // Never log credentials, request bodies, connection URIs, or reset links.
      console.error(
        "API operation failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      return json(
        { error: "Service temporarily unavailable. Please try again." },
        503,
      );
    }
  };
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const trusted =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin;
  if (!origin || origin !== new URL(trusted).origin)
    throw new ApiError(403, "Request origin is not allowed.");
}
export async function body<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new ApiError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  return schema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}
export function objectId(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, "Invalid ID.");
  return id;
}
export function pagination(request: Request) {
  const query = new URL(request.url).searchParams;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(query.get("page") || 1);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .parse(query.get("limit") || 24);
  const search = (query.get("search") || "").trim().slice(0, 100);
  const status = query.get("status") || "";
  return { page, limit, skip: (page - 1) * limit, search, status };
}
export function searchPattern(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Shared, atomic fixed-window rate limits; TTL cleanup is not used for enforcement. */
export async function rateLimit(key: string, limit: number, seconds: number) {
  await connectDB();
  const window = Math.floor(Date.now() / (seconds * 1000));
  const filter = { key: tokenHash(`${key}:${window}`) };
  const record = await RateLimit.findOneAndUpdate(
    filter,
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((window + 1) * seconds * 1000) },
    },
    { upsert: true, new: true },
  ).catch(async (error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return RateLimit.findOneAndUpdate(
        filter,
        { $inc: { count: 1 } },
        { new: true },
      );
    throw error;
  });
  if (!record) throw new ApiError(503, "Please try again.");
  if (record.count > limit)
    throw new ApiError(429, "Too many attempts. Please try again later.");
}
export function clientAddress(request: Request) {
  // Enable only behind a trusted proxy that overwrites this header.
  return process.env.TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "shared";
}
