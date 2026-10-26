import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { windowsTestMongoBinary } from "./test-mongo-binary.mjs";
import { ApiError } from "../lib/api";
import { Meeting, MeetingLock } from "../lib/meeting-models";
import { bookMeeting, refreshMeeting } from "../lib/meeting-service";
import {
  meetingAvailability,
  meetingConfig,
  type CalendlyEvent,
  type CalendlyInvitee,
} from "../lib/calendly-api";
import { GET } from "../app/api/meetings/availability/route";
import { POST } from "../app/api/meetings/book/route";
import { meetingStatus, type MeetingInput } from "../lib/meeting-contract";

// No .env loader: this test owns a disposable database and mocks only the fixed
// Calendly transport. It never uses a real calendar, SMTP server or Atlas URI.
const eventType = "https://api.calendly.com/event_types/test-event";
const host = "https://api.calendly.com/users/test-host";
const origin = "http://localhost:3999";
const future = new Date(
  Math.ceil((Date.now() + 7 * 86400000) / 86400000) * 86400000 + 10 * 3600000,
).toISOString();
let database: MongoMemoryServer | undefined;
const originalFetch = globalThis.fetch;
let posts = 0,
  requests = 0;
let mode = "ok",
  available = true,
  cancelled = false;
let lastBody: Record<string, unknown> = {};
const events: CalendlyEvent[] = [],
  invitees: CalendlyInvitee[] = [];
let questions: Record<string, unknown>[] = [];
let tests = 0;
function pass(name: string) {
  tests++;
  console.log(`PASS ${name}`);
}
function input(startTime = future): MeetingInput {
  return {
    requestId: randomUUID(),
    name: "Test Client",
    email: "client@example.test",
    phone: "+92 300 1234567",
    company: "Test company",
    message: "Automation",
    projectType: "Automation",
    timezone: "Asia/Karachi",
    startTime,
    answers: [],
  };
}
function apiRequest(data: unknown, requestOrigin = origin) {
  return new Request(`${origin}/api/meetings/book`, {
    method: "POST",
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}
async function reset() {
  await Promise.all([Meeting.deleteMany({}), MeetingLock.deleteMany({})]);
  posts = 0;
  mode = "ok";
  available = true;
  cancelled = false;
  questions = [];
  events.length = 0;
  invitees.length = 0;
}
globalThis.fetch = async (raw, init) => {
  requests++;
  const url = new URL(String(raw));
  assert.equal(url.origin, "https://api.calendly.com");
  assert.equal(
    new Headers(init?.headers).get("authorization"),
    "Bearer fake-test-token",
  );
  if (url.pathname === "/event_types/test-event")
    return json({
      resource: {
        active: true,
        duration: 30,
        kind: "solo",
        pooling_type: null,
        profile: { type: "User", owner: host },
        locations: [{ kind: "zoom_conference" }],
        custom_questions: questions,
      },
    });
  if (url.pathname === "/event_type_available_times") {
    const start = Date.parse(url.searchParams.get("start_time")!),
      end = Date.parse(url.searchParams.get("end_time")!);
    assert.ok(end - start <= 31 * 86400000);
    return json({
      collection: available
        ? [
            {
              status: "available",
              invitees_remaining: 1,
              start_time: new Date(start).toISOString(),
            },
            { status: "unavailable", start_time: future },
            { status: "available", invitees_remaining: 0, start_time: future },
          ]
        : [],
    });
  }
  if (url.pathname === "/invitees") {
    posts++;
    const data = JSON.parse(String(init?.body));
    lastBody = data;
    if (mode === "403" || mode === "400" || mode === "401")
      return json({ error: "UPSTREAM_PRIVATE_ERROR" }, Number(mode));
    const event = {
      uri: `https://api.calendly.com/scheduled_events/event-${posts}`,
      start_time: data.start_time,
      end_time: new Date(Date.parse(data.start_time) + 1800000).toISOString(),
      status: "active",
      event_type: eventType,
    };
    const invitee = {
      uri: `${event.uri}/invitees/invitee-${posts}`,
      event: event.uri,
      status: "active",
      ...data.invitee,
      tracking: data.tracking,
      reschedule_url: "https://calendly.com/reschedulings/test",
      cancel_url: "https://malicious.example/cancel",
    };
    events.push(event);
    invitees.push(invitee);
    if (mode === "lost") throw new Error("Lost upstream response");
    return json({ resource: invitee }, 201);
  }
  if (url.pathname === "/scheduled_events") return json({ collection: events });
  if (url.pathname.endsWith("/invitees")) return json({ collection: invitees });
  if (url.pathname.includes("/invitees/"))
    return json({
      resource: { ...invitees[0], status: cancelled ? "canceled" : "active" },
    });
  if (url.pathname.startsWith("/scheduled_events/")) {
    if (mode === "event-failure") return json({}, 503);
    return json({
      resource: { ...events[0], status: cancelled ? "canceled" : "active" },
    });
  }
  throw new Error(`Unexpected mock endpoint: ${url.pathname}`);
};
try {
  process.env.CALENDLY_ACCESS_TOKEN = "fake-test-token";
  process.env.CALENDLY_EVENT_TYPE_URI = eventType;
  process.env.CALENDLY_SCHEDULING_ENABLED = "false";
  assert.throws(
    meetingConfig,
    (error) => error instanceof ApiError && error.status === 503,
  );
  pass("disabled scheduling fails closed");
  process.env.CALENDLY_SCHEDULING_ENABLED = "true";
  process.env.CALENDLY_EVENT_TYPE_URI = "https://malicious.example/event";
  assert.throws(meetingConfig);
  pass("trusted server event type validation");
  process.env.CALENDLY_EVENT_TYPE_URI = eventType;
  database = await MongoMemoryServer.create({
    binary: { systemBinary: await windowsTestMongoBinary() },
  });
  process.env.MONGODB_URI = database.getUri();
  process.env.APP_URL = origin;
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([Meeting.init(), MeetingLock.init()]);
  assert.equal(
    (await POST(apiRequest(input(), "https://wrong.example"))).status,
    403,
  );
  pass("cross-origin booking denied");
  assert.equal(
    (await POST(apiRequest({ ...input(), event_type: "injected" }))).status,
    400,
  );
  pass("client event type injection rejected");
  assert.equal(
    (await POST(apiRequest({ ...input(), email: "invalid" }))).status,
    400,
  );
  pass("server validates email");
  assert.equal(
    (await POST(apiRequest({ ...input(), timezone: "Invalid/Zone" }))).status,
    400,
  );
  pass("server validates IANA timezone");
  const before = requests;
  const badRange = new URLSearchParams({
    start: future,
    end: new Date(Date.parse(future) + 32 * 86400000).toISOString(),
    timezone: "UTC",
  });
  assert.equal(
    (await GET(new Request(`${origin}/api/meetings/availability?${badRange}`)))
      .status,
    400,
  );
  assert.equal(requests, before);
  pass("availability ranges over 31 days rejected before upstream");
  const slots = await meetingAvailability(
    new Date(future),
    new Date(Date.parse(future) + 3600000),
    "Asia/Karachi",
  );
  assert.equal(slots.slots.length, 1);
  assert.equal(slots.duration, 30);
  assert.equal(slots.slots[0].timezone, "Asia/Karachi");
  assert.equal(JSON.stringify(slots).includes("fake-test-token"), false);
  assert.equal(JSON.stringify(slots).includes(eventType), false);
  pass("only available slots and frontend-safe metadata returned");
  await assert.rejects(
    () => bookMeeting(input(new Date(Date.now() - 86400000).toISOString())),
    (error) => error instanceof ApiError && error.status === 400,
  );
  pass("past time cannot book");
  const expiredInput = input(new Date(Date.now() - 86400000).toISOString());
  const expired = await POST(apiRequest(expiredInput));
  assert.equal(expired.status, 400);
  assert.equal((await expired.json()).code, "SLOT_EXPIRED");
  assert.equal(
    await Meeting.exists({ requestId: expiredInput.requestId }),
    null,
  );
  pass(
    "expired request is explicitly resolved only when no booking attempt exists",
  );
  await reset();
  available = false;
  await assert.rejects(
    () => bookMeeting(input()),
    (error) => error instanceof ApiError && error.status === 409,
  );
  assert.equal(posts, 0);
  assert.equal(await Meeting.countDocuments({}), 0);
  pass("stale slot rechecked and released without creating an invitee");
  await reset();
  const bookingInput = input();
  const result = await bookMeeting(bookingInput);
  assert.ok("booking" in result);
  assert.equal(result.booking?.name, "Test Client");
  assert.equal("cancelUrl" in (result.booking || {}), false);
  assert.equal("rescheduleUrl" in (result.booking || {}), false);
  assert.equal(JSON.stringify(result).includes("calendly"), false);
  const saved = await Meeting.findOne({
    requestId: bookingInput.requestId,
  }).lean<{ rescheduleUrl?: string }>();
  assert.equal(saved?.rescheduleUrl, "https://calendly.com/reschedulings/test");
  assert.equal(lastBody.event_type, eventType);
  assert.equal((lastBody.location as { kind: string }).kind, "zoom_conference");
  assert.equal(lastBody.start_time, future);
  assert.equal(posts, 1);
  pass("confirmed booking persists provider details only on the backend");
  assert.deepEqual(await bookMeeting(bookingInput), result);
  assert.equal(posts, 1);
  pass("idempotent replay never creates a second invitee");
  await assert.rejects(
    () => bookMeeting({ ...bookingInput, email: "other@example.test" }),
    (error) => error instanceof ApiError && error.status === 409,
  );
  pass("idempotency key cannot expose another payload's confirmation");
  await reset();
  const simultaneous = await Promise.allSettled(
    Array.from({ length: 10 }, () => bookMeeting(input())),
  );
  assert.equal(
    simultaneous.filter((item) => item.status === "fulfilled").length,
    1,
  );
  assert.equal(posts, 1);
  assert.equal(await Meeting.countDocuments({ state: "confirmed" }), 1);
  pass("ten concurrent clients create exactly one Calendly booking");
  await reset();
  const overlap = await Promise.allSettled([
    bookMeeting(input()),
    bookMeeting(input(new Date(Date.parse(future) + 900000).toISOString())),
  ]);
  assert.equal(overlap.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(posts, 1);
  pass("overlapping starts share the atomic host lease");
  await reset();
  mode = "403";
  await assert.rejects(
    () => bookMeeting(input()),
    (error) =>
      error instanceof ApiError &&
      error.status === 403 &&
      !error.message.includes("UPSTREAM_PRIVATE"),
  );
  assert.equal(await Meeting.countDocuments({}), 0);
  pass("Free-plan or scope 403 never confirms and releases the hold");
  await reset();
  mode = "400";
  await assert.rejects(
    () => bookMeeting(input()),
    (error) => error instanceof ApiError && error.status === 409,
  );
  assert.equal(await Meeting.countDocuments({}), 0);
  pass("Calendly availability conflict returns a clean retryable error");
  await reset();
  mode = "lost";
  const lostInput = input();
  const pending = await bookMeeting(lostInput);
  assert.equal("pending" in pending, true);
  assert.equal(
    await Meeting.countDocuments({
      state: "pending",
      expiresAt: { $exists: false },
    }),
    1,
  );
  pass("ambiguous POST retains a non-expiring hold and never claims success");
  mode = "ok";
  const reconciled = await bookMeeting(lostInput);
  assert.ok("booking" in reconciled);
  assert.equal(posts, 1);
  pass("lost response reconciles via request tracking without another POST");
  await reset();
  mode = "event-failure";
  const failedRead = input();
  assert.equal("pending" in (await bookMeeting(failedRead)), true);
  mode = "ok";
  assert.ok("booking" in (await bookMeeting(failedRead)));
  assert.equal(posts, 1);
  pass("post-create read failure retains and reconciles the original booking");
  cancelled = true;
  assert.deepEqual(await refreshMeeting(failedRead.requestId), {
    state: "cancelled",
  });
  pass("admin check updates externally cancelled meetings");
  const cancelledResponse = await POST(apiRequest(failedRead));
  assert.equal(cancelledResponse.status, 409);
  assert.equal((await cancelledResponse.json()).code, "BOOKING_CANCELLED");
  pass(
    "cancelled request has a definitive recovery code without creating another invitee",
  );
  await reset();
  questions = [
    {
      name: "Preparation notes",
      position: 0,
      type: "string",
      required: true,
      enabled: true,
    },
  ];
  await assert.rejects(
    () => bookMeeting(input()),
    (error) => error instanceof ApiError && error.status === 400,
  );
  assert.equal(posts, 0);
  pass("Calendly-required answers validated before submission");
  await bookMeeting({
    ...input(),
    answers: [{ position: 0, answer: "Test notes" }],
  });
  assert.equal(
    (lastBody.questions_and_answers as { answer: string }[])[0].answer,
    "Test notes",
  );
  pass("configured Calendly questions use validated client details");
  for (const [field, value] of [
    ["phone", ""],
    ["phone", "letters"],
    ["company", ""],
    ["message", ""],
  ]) {
    assert.equal(
      (await POST(apiRequest({ ...input(), [field]: value }))).status,
      400,
    );
  }
  pass("phone, organization and purpose are required by the backend");
  const statusExample = {
    state: "confirmed",
    startTime: "2026-10-28T10:00:00Z",
    endTime: "2026-10-28T10:30:00Z",
  };
  assert.equal(
    meetingStatus(statusExample, Date.parse("2026-10-28T09:59:59Z")),
    "Upcoming",
  );
  assert.equal(
    meetingStatus(statusExample, Date.parse("2026-10-28T10:00:00Z")),
    "In Progress",
  );
  assert.equal(
    meetingStatus(statusExample, Date.parse("2026-10-28T10:30:00Z")),
    "Completed",
  );
  assert.equal(
    meetingStatus(
      { ...statusExample, state: "cancelled" },
      Date.parse("2026-10-28T10:00:00Z"),
    ),
    "Cancelled",
  );
  pass("Admin meeting states advance at the correct UTC boundaries");
  console.log(
    `${tests} meeting checks passed; no real Calendly or production database requests.`,
  );
} finally {
  globalThis.fetch = originalFetch;
  await mongoose.disconnect();
  await database?.stop();
}
