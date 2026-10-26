import { z } from "zod";
import { ApiError, endpoint, json, rateLimit, clientAddress } from "@/lib/api";
import { meetingAvailability, meetingConfig } from "@/lib/calendly-api";
import { timezoneSchema } from "@/lib/meeting-contract";
export const runtime = "nodejs";
export const GET = endpoint(async (request) => {
  meetingConfig();
  const query = new URL(request.url).searchParams;
  const start = new Date(
    z.iso.datetime({ offset: true }).parse(query.get("start")),
  );
  const end = new Date(
    z.iso.datetime({ offset: true }).parse(query.get("end")),
  );
  const timezone = timezoneSchema.parse(query.get("timezone"));
  if (
    start.getTime() < Date.now() - 60000 ||
    start.getTime() > Date.now() + 366 * 86400000 ||
    end.getTime() - start.getTime() > 31 * 86400000 ||
    end <= start
  )
    throw new ApiError(400, "Choose a future date range of up to 31 days.");
  await rateLimit(
    `meeting-availability:${clientAddress(request)}`,
    process.env.TRUST_PROXY === "true" ? 120 : 1200,
    60,
  );
  return json(await meetingAvailability(start, end, timezone));
});
