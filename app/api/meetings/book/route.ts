import {
  endpoint,
  json,
  body,
  checkOrigin,
  rateLimit,
  clientAddress,
} from "@/lib/api";
import { meetingInput } from "@/lib/meeting-contract";
import { bookMeeting } from "@/lib/meeting-service";
import { meetingConfig } from "@/lib/calendly-api";
export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  checkOrigin(request);
  meetingConfig();
  const input = await body(request, meetingInput);
  await rateLimit(
    `meeting-book:${clientAddress(request)}`,
    process.env.TRUST_PROXY === "true" ? 20 : 200,
    600,
  );
  await rateLimit(`meeting-email:${input.email}`, 12, 600);
  const result = await bookMeeting(input);
  return json(result, "pending" in result ? 202 : 200);
});
