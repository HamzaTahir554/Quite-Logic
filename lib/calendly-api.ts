import "server-only";
import { ApiError } from "./api";
import {
  dateInZone,
  type Availability,
  type MeetingQuestion,
} from "./meeting-contract";

export const schedulingUnavailable =
  "Online scheduling is currently unavailable. Please contact us to arrange a meeting.";
export class CalendlyError extends ApiError {
  constructor(
    public upstreamStatus: number,
    public uncertain = false,
  ) {
    super(
      upstreamStatus === 403 ? 403 : 503,
      upstreamStatus === 403
        ? "Online booking is not enabled for this calendar. Please contact us to arrange a meeting."
        : "We couldn't reach the calendar right now. Please try again.",
    );
  }
}
export function meetingConfig() {
  const token = process.env.CALENDLY_ACCESS_TOKEN?.trim();
  const eventType = process.env.CALENDLY_EVENT_TYPE_URI?.trim();
  // Explicit opt-in after the owner verifies Standard+ and Scheduling API scopes.
  if (
    process.env.CALENDLY_SCHEDULING_ENABLED !== "true" ||
    !token ||
    !eventType ||
    !/^https:\/\/api\.calendly\.com\/event_types\/[\w-]+$/.test(eventType)
  )
    throw new ApiError(503, schedulingUnavailable);
  return { token, eventType };
}
export function calendlyPath(
  uri: string,
  resource: "event_types" | "scheduled_events" | "users",
) {
  const pattern = new RegExp(
    `^https://api\\.calendly\\.com/${resource}/[\\w-]+$`,
  );
  if (!pattern.test(uri)) throw new CalendlyError(502);
  return new URL(uri).pathname;
}
export async function calendly<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { token } = meetingConfig();
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new CalendlyError(502);
  const post = init?.method === "POST";
  let response: Response;
  try {
    response = await fetch(`https://api.calendly.com${path}`, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch {
    throw new CalendlyError(503, post);
  }
  if (!response.ok)
    throw new CalendlyError(response.status, post && response.status >= 500);
  try {
    return (await response.json()) as T;
  } catch {
    throw new CalendlyError(502, post);
  }
}
type EventType = {
  active: boolean;
  duration: number;
  kind: string;
  pooling_type?: string;
  profile: { type: string; owner: string };
  locations: { kind: string; location?: string; phone_number?: string }[];
  custom_questions?: {
    name: string;
    position: number;
    enabled: boolean;
    required: boolean;
    type: string;
    answer_choices?: string[];
    include_other?: boolean;
  }[];
};
export async function getMeetingType() {
  const { eventType } = meetingConfig();
  const { resource } = await calendly<{ resource: EventType }>(
    calendlyPath(eventType, "event_types"),
  );
  if (
    !resource.active ||
    resource.kind !== "solo" ||
    resource.pooling_type ||
    resource.profile.type !== "User" ||
    !Number.isFinite(resource.duration) ||
    resource.duration < 1
  )
    throw new ApiError(503, schedulingUnavailable);
  calendlyPath(resource.profile.owner, "users");
  const questions: MeetingQuestion[] = [];
  for (const question of resource.custom_questions || []) {
    if (!question.enabled) continue;
    const supported = [
      "string",
      "text",
      "phone_number",
      "single_select",
      "multi_select",
    ].includes(question.type);
    if (!supported) {
      if (question.required) throw new ApiError(503, schedulingUnavailable);
      continue;
    }
    const field = /phone/i.test(question.name)
      ? "phone"
      : /company|organi[sz]ation/i.test(question.name)
        ? "company"
        : /project type/i.test(question.name)
          ? "projectType"
          : /reason|discuss|message|help|anything/i.test(question.name)
            ? "message"
            : undefined;
    questions.push({
      name: question.name,
      position: question.position,
      required: question.required,
      type: question.type as MeetingQuestion["type"],
      choices: question.answer_choices || [],
      // Choice-based questions retain their Calendly choices instead of a free text mapping.
      field: ["string", "text", "phone_number"].includes(question.type)
        ? field
        : undefined,
    });
  }
  if ((resource.locations?.length || 0) > 1)
    throw new ApiError(503, schedulingUnavailable);
  const location = resource.locations?.[0];
  if (
    location &&
    ![
      "zoom_conference",
      "google_conference",
      "microsoft_teams_conference",
      "webex_conference",
      "gotomeeting_conference",
      "custom",
      "physical",
      "inbound_call",
      "outbound_call",
    ].includes(location.kind)
  )
    throw new ApiError(503, schedulingUnavailable);
  return {
    eventType,
    host: resource.profile.owner,
    duration: resource.duration,
    questions,
    location,
    phoneRequired: location?.kind === "outbound_call",
  };
}
export async function availableTimes(start: Date, end: Date) {
  const { eventType } = meetingConfig();
  if (
    end.getTime() <= start.getTime() ||
    end.getTime() - start.getTime() > 31 * 86400000
  )
    throw new ApiError(400, "Choose a date range of up to 31 days.");
  const params = new URLSearchParams({
    event_type: eventType,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  });
  const data = await calendly<{
    collection: {
      status: string;
      start_time: string;
      invitees_remaining?: number;
    }[];
  }>(`/event_type_available_times?${params}`);
  if (!Array.isArray(data.collection)) throw new CalendlyError(502);
  return data.collection
    .filter(
      (slot) =>
        slot.status === "available" &&
        slot.invitees_remaining !== 0 &&
        Number.isFinite(Date.parse(slot.start_time)),
    )
    .map((slot) => new Date(slot.start_time).toISOString())
    .filter(
      (time) =>
        Date.parse(time) >= start.getTime() && Date.parse(time) < end.getTime(),
    );
}
export async function meetingAvailability(
  start: Date,
  end: Date,
  timezone: string,
): Promise<Availability> {
  const [type, times] = await Promise.all([
    getMeetingType(),
    availableTimes(start, end),
  ]);
  return {
    duration: type.duration,
    questions: type.questions,
    phoneRequired: type.phoneRequired,
    slots: [...new Set(times)].sort().map((startTime) => ({
      startTime,
      date: dateInZone(startTime, timezone),
      timezone,
      available: true,
    })),
  };
}
export type CalendlyEvent = {
  uri: string;
  start_time: string;
  end_time: string;
  status: string;
  event_type: string;
};
export type CalendlyInvitee = {
  uri: string;
  event: string;
  status: string;
  name: string;
  email: string;
  timezone: string;
  cancel_url?: string;
  reschedule_url?: string;
  tracking?: { utm_content?: string };
};
export function safeMeetingUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "calendly.com" &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
