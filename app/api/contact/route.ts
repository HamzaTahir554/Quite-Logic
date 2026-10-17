import { contactSchema } from "@/lib/contact";
import { HttpError, rateLimit, readJson } from "@/lib/admin-security";
import { storeAndNotifyContact } from "@/lib/email/contact";
export const runtime = "nodejs";
export const maxDuration = 60;
const response = (success: boolean, message: string, status: number) =>
  Response.json(
    { success, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function POST(request: Request) {
  try {
    const parsed = contactSchema.safeParse(await readJson(request, 32000));
    if (!parsed.success)
      return response(false, "Please check the submitted information.", 400);
    await rateLimit("contact:global", 60);
    await rateLimit("contact:" + parsed.data.email.toLowerCase(), 5);
    await storeAndNotifyContact(
      parsed.data,
      request.headers.get("idempotency-key"),
    );
    return response(true, "Message sent successfully.", 200);
  } catch (error) {
    if (error instanceof HttpError && error.status === 429)
      return response(
        false,
        "Too many requests. Please try again shortly.",
        429,
      );
    if (error instanceof HttpError && [400, 413, 415].includes(error.status))
      return response(
        false,
        "Please check the submitted information.",
        error.status === 413 ? 413 : 400,
      );
    if (error instanceof HttpError && error.status === 403)
      return response(false, "Please reload this page and try again.", 403);
    if (error instanceof HttpError && error.status === 409)
      return response(false, error.message, 409);
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        route: "/api/contact",
        operation: "contact.notify",
        status: "failed",
      }),
    );
    return response(false, "Unable to send message.", 500);
  }
}
