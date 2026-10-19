import {
  body,
  checkOrigin,
  clientAddress,
  endpoint,
  json,
  rateLimit,
} from "@/lib/api";
import { contactSchema } from "@/lib/contact";
import { sendContactInquiry } from "@/lib/email";

export const runtime = "nodejs";

export const POST = endpoint(async (request) => {
  checkOrigin(request);
  await rateLimit(`contact-ip:${clientAddress(request)}`, 20, 15 * 60);
  const input = await body(request, contactSchema);
  await rateLimit(`contact-email:${input.email.toLowerCase()}`, 5, 60 * 60);
  await sendContactInquiry(input);
  return json({
    message: "Your message has been submitted. We’ll reply to your email.",
  });
});
