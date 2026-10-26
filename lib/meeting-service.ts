import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { ApiError } from "./api";
import { connectDB } from "./mongodb";
import { Meeting, MeetingLock } from "./meeting-models";
import {
  availableTimes,
  calendly,
  calendlyPath,
  CalendlyError,
  getMeetingType,
  safeMeetingUrl,
  type CalendlyEvent,
  type CalendlyInvitee,
} from "./calendly-api";
import {
  meetingInput,
  slotConflict,
  type MeetingInput,
  type MeetingConfirmation,
} from "./meeting-contract";

const duplicate = (error: unknown) =>
  !!error &&
  typeof error === "object" &&
  "code" in error &&
  error.code === 11000;
const pendingMessage =
  "We're checking your booking. Please check confirmation again before trying another time.";
type StoredMeeting = {
  requestId: string;
  fingerprint?: string;
  eventType: string;
  host: string;
  state: string;
  name: string;
  email: string;
  timezone: string;
  eventUri?: string;
  inviteeUri?: string;
  startTime: Date;
  endTime: Date;
  cancelUrl?: string;
  rescheduleUrl?: string;
};
function confirmation(meeting: StoredMeeting): MeetingConfirmation {
  return {
    name: meeting.name,
    startTime: meeting.startTime.toISOString(),
    endTime: meeting.endTime.toISOString(),
    timezone: meeting.timezone,
  };
}
export async function confirmMeeting(
  requestId: string,
  invitee: CalendlyInvitee,
  event: CalendlyEvent,
) {
  const current = await Meeting.findOne({ requestId }).lean<StoredMeeting>();
  if (
    !current ||
    invitee.status !== "active" ||
    event.status !== "active" ||
    event.event_type !== current.eventType ||
    invitee.email.toLowerCase() !== current.email ||
    Date.parse(event.start_time) !== current.startTime.getTime() ||
    !Number.isFinite(Date.parse(event.end_time))
  )
    throw new CalendlyError(502, true);
  calendlyPath(event.uri, "scheduled_events");
  if (
    !new RegExp(
      `^${event.uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/invitees/[\\w-]+$`,
    ).test(invitee.uri)
  )
    throw new CalendlyError(502, true);
  const saved = await Meeting.findOneAndUpdate(
    { requestId },
    {
      $set: {
        state: "confirmed",
        eventUri: event.uri,
        inviteeUri: invitee.uri,
        endTime: new Date(event.end_time),
        cancelUrl: safeMeetingUrl(invitee.cancel_url),
        rescheduleUrl: safeMeetingUrl(invitee.reschedule_url),
      },
      $unset: { expiresAt: 1 },
    },
    { returnDocument: "after" },
  ).lean<StoredMeeting>();
  if (!saved) throw new CalendlyError(502, true);
  return confirmation(saved);
}

// A timed-out POST may have booked successfully. Reconcile by our opaque request
// ID in Calendly tracking, never by resending POST /invitees or guessing success.
export async function reconcileMeeting(meeting: StoredMeeting) {
  if (meeting.state === "confirmed") return confirmation(meeting);
  if (meeting.state === "cancelled")
    throw new ApiError(
      409,
      "This meeting was cancelled. Please choose a new time.",
      "BOOKING_CANCELLED",
    );
  if (!["pending", "submitting"].includes(meeting.state)) return null;
  const query = new URLSearchParams({
    user: meeting.host,
    status: "active",
    min_start_time: meeting.startTime.toISOString(),
    max_start_time: new Date(meeting.startTime.getTime() + 1000).toISOString(),
    count: "100",
  });
  const events = await calendly<{ collection: CalendlyEvent[] }>(
    `/scheduled_events?${query}`,
  );
  for (const event of events.collection) {
    if (
      event.event_type !== meeting.eventType ||
      Date.parse(event.start_time) !== meeting.startTime.getTime()
    )
      continue;
    const path = calendlyPath(event.uri, "scheduled_events");
    const { collection } = await calendly<{ collection: CalendlyInvitee[] }>(
      `${path}/invitees?status=active&count=100`,
    );
    const invitee = collection.find(
      (item) =>
        item.email.toLowerCase() === meeting.email &&
        item.tracking?.utm_content === meeting.requestId,
    );
    if (invitee) return confirmMeeting(meeting.requestId, invitee, event);
  }
  return null;
}
export async function refreshMeeting(requestId: string) {
  const meeting = await Meeting.findOne({ requestId }).lean<StoredMeeting>();
  if (!meeting) throw new ApiError(404, "Meeting not found.");
  if (meeting.state === "confirmed" && meeting.eventUri && meeting.inviteeUri) {
    const path = calendlyPath(meeting.eventUri, "scheduled_events");
    if (
      !meeting.inviteeUri.startsWith(
        `https://api.calendly.com${path}/invitees/`,
      ) ||
      !/\/invitees\/[\w-]+$/.test(meeting.inviteeUri)
    )
      throw new CalendlyError(502);
    const [{ resource: event }, { resource: invitee }] = await Promise.all([
      calendly<{ resource: CalendlyEvent }>(path),
      calendly<{ resource: CalendlyInvitee }>(
        new URL(meeting.inviteeUri).pathname,
      ),
    ]);
    if (event.status !== "active" || invitee.status !== "active") {
      await Meeting.updateOne({ requestId }, { $set: { state: "cancelled" } });
      return { state: "cancelled" };
    }
    await confirmMeeting(requestId, invitee, event);
    return { state: "confirmed" };
  }
  const confirmed = await reconcileMeeting(meeting);
  return { state: confirmed ? "confirmed" : meeting.state };
}
function answersFor(
  type: Awaited<ReturnType<typeof getMeetingType>>,
  input: MeetingInput,
) {
  const positions = new Set<number>();
  for (const answer of input.answers) {
    if (
      positions.has(answer.position) ||
      !type.questions.some((question) => question.position === answer.position)
    )
      throw new ApiError(
        400,
        "Please refresh the meeting form and check your answers.",
      );
    positions.add(answer.position);
  }
  return type.questions.flatMap((question) => {
    const answer = question.field
      ? input[question.field]
      : input.answers.find((item) => item.position === question.position)
          ?.answer || "";
    if (question.required && !answer)
      throw new ApiError(400, `Please answer: ${question.name}`);
    if (answer && question.type.endsWith("select")) {
      const values =
        question.type === "multi_select" ? answer.split("\n") : [answer];
      if (values.some((value) => !question.choices.includes(value)))
        throw new ApiError(400, "Choose one of the available answers.");
    }
    return answer
      ? [{ question: question.name, position: question.position, answer }]
      : [];
  });
}
export async function bookMeeting(raw: unknown) {
  const input = meetingInput.parse(raw);
  input.startTime = new Date(input.startTime).toISOString();
  input.answers.sort((a, b) => a.position - b.position);
  const { requestId, ...details } = input;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(details))
    .digest("hex");
  await connectDB();
  await Promise.all([Meeting.init(), MeetingLock.init()]);
  await Meeting.deleteMany({
    state: "holding",
    expiresAt: { $lte: new Date() },
  });
  const existing = await Meeting.findOne({ requestId })
    .select("+fingerprint")
    .lean<StoredMeeting>();
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new ApiError(
        409,
        "This booking request already has different details. Please reopen the meeting form.",
      );
    const booked = await reconcileMeeting(existing);
    return booked
      ? { booking: booked }
      : { pending: true as const, message: pendingMessage };
  }
  const start = new Date(input.startTime);
  if (
    start.getTime() < Date.now() + 60000 ||
    start.getTime() > Date.now() + 366 * 86400000
  )
    throw new ApiError(400, "Choose a future available time.", "SLOT_EXPIRED");
  const type = await getMeetingType();
  const questions_and_answers = answersFor(type, input);
  if (type.phoneRequired && !/^\+?[\d\s().-]{6,40}$/.test(input.phone))
    throw new ApiError(
      400,
      "Enter a phone number, including the country code.",
    );
  const end = new Date(start.getTime() + type.duration * 60000);
  const owner = randomUUID();
  // A short host-wide lease also prevents overlapping starts (e.g. 10:00 and
  // 10:15) across all workers. Calendly remains authoritative for external bookings.
  try {
    const lock = await MeetingLock.findOneAndUpdate(
      { _id: type.host, expiresAt: { $lte: new Date() } },
      { $set: { owner, expiresAt: new Date(Date.now() + 90000) } },
      { upsert: true, returnDocument: "after" },
    );
    if (!lock) throw new ApiError(409, slotConflict);
  } catch (error) {
    if (duplicate(error)) throw new ApiError(409, slotConflict);
    throw error;
  }
  let held = false,
    submitted = false,
    created = false;
  try {
    const overlap = await Meeting.exists({
      host: type.host,
      state: { $ne: "cancelled" },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (overlap) throw new ApiError(409, slotConflict);
    try {
      await Meeting.create({
        requestId,
        fingerprint,
        eventType: type.eventType,
        host: type.host,
        ...details,
        startTime: start,
        endTime: end,
        state: "holding",
        expiresAt: new Date(Date.now() + 90000),
      });
      held = true;
    } catch (error) {
      if (duplicate(error)) throw new ApiError(409, slotConflict);
      throw error;
    }
    // Recheck the exact slot immediately before the external POST.
    const available = await availableTimes(
      start,
      new Date(start.getTime() + 60000),
    );
    if (!available.includes(start.toISOString()))
      throw new ApiError(409, slotConflict);
    const renewed = await MeetingLock.updateOne(
      { _id: type.host, owner, expiresAt: { $gt: new Date() } },
      { $set: { expiresAt: new Date(Date.now() + 90000) } },
    );
    if (!renewed.matchedCount) throw new ApiError(409, slotConflict);
    const marked = await Meeting.updateOne(
      { requestId, state: "holding", expiresAt: { $gt: new Date() } },
      { $set: { state: "submitting" }, $unset: { expiresAt: 1 } },
    );
    if (!marked.matchedCount) throw new ApiError(409, slotConflict);
    submitted = true;
    const location = type.location
      ? {
          kind: type.location.kind,
          ...(["physical", "custom", "inbound_call", "outbound_call"].includes(
            type.location.kind,
          )
            ? {
                location: type.phoneRequired
                  ? input.phone
                  : type.location.location || type.location.phone_number,
              }
            : {}),
        }
      : undefined;
    const { resource: invitee } = await calendly<{ resource: CalendlyInvitee }>(
      "/invitees",
      {
        method: "POST",
        body: JSON.stringify({
          event_type: type.eventType,
          start_time: start.toISOString(),
          invitee: {
            name: input.name,
            email: input.email,
            timezone: input.timezone,
          },
          location,
          questions_and_answers,
          tracking: { utm_source: "quietlogic", utm_content: requestId },
        }),
      },
    );
    created = true;
    const { resource: event } = await calendly<{ resource: CalendlyEvent }>(
      calendlyPath(invitee.event, "scheduled_events"),
    );
    return { booking: await confirmMeeting(requestId, invitee, event) };
  } catch (error) {
    if (
      held &&
      submitted &&
      (created || !(error instanceof CalendlyError) || error.uncertain)
    ) {
      // Preserve the non-expiring hold on uncertain results, including a database
      // failure after Calendly accepted the booking. Retrying only reconciles.
      await Meeting.updateOne(
        { requestId, state: { $ne: "confirmed" } },
        { $set: { state: "pending" }, $unset: { expiresAt: 1 } },
      ).catch(() => {});
      return { pending: true as const, message: pendingMessage };
    }
    if (held)
      await Meeting.deleteOne({ requestId, state: { $ne: "confirmed" } });
    if (
      error instanceof CalendlyError &&
      [400, 409, 422].includes(error.upstreamStatus)
    )
      throw new ApiError(409, slotConflict);
    throw error;
  } finally {
    await MeetingLock.deleteOne({ _id: type.host, owner });
  }
}
