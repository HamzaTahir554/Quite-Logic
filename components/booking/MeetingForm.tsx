"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import FabricButton from "@/components/ui/FabricButton";
import { contactEmail } from "@/lib/company";
import {
  dateInZone,
  meetingDetailsInput,
  type Availability,
  type MeetingInput,
  type MeetingConfirmation,
  type MeetingQuestion,
} from "@/lib/meeting-contract";

const dayMs = 86400000;
const defaultError = "We couldn't load available times. Please try again.";
async function fetchAvailability(
  query: URLSearchParams,
  parent: AbortSignal,
): Promise<Availability> {
  const request = new AbortController();
  const abort = () => request.abort();
  parent.addEventListener("abort", abort, { once: true });
  if (parent.aborted) request.abort();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    request.abort();
  }, 20000);
  try {
    const response = await fetch(`/api/meetings/availability?${query}`, {
      signal: request.signal,
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || defaultError);
    if (
      !Array.isArray(body.slots) ||
      !Array.isArray(body.questions) ||
      typeof body.duration !== "number"
    )
      throw new Error(defaultError);
    return body;
  } catch (error) {
    if (timedOut)
      throw new Error(
        "The calendar took too long to respond. Please try again.",
      );
    if (error instanceof TypeError || error instanceof SyntaxError)
      throw new Error(defaultError);
    throw error;
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", abort);
  }
}
function monthFrom(date: string) {
  return new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
}
function displayDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}
function displayTime(start: string, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(start));
}

export default function MeetingForm({
  active,
  onBusy,
  onDone,
}: {
  active: boolean;
  onBusy: (busy: boolean) => void;
  onDone: () => void;
}) {
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [zones] = useState(() =>
    [
      ...new Set([
        timezone,
        "UTC",
        ...(typeof Intl.supportedValuesOf === "function"
          ? Intl.supportedValuesOf("timeZone")
          : [
              "Asia/Karachi",
              "Europe/London",
              "America/New_York",
              "America/Los_Angeles",
              "Asia/Dubai",
              "Asia/Kolkata",
              "Australia/Sydney",
            ]),
      ]),
    ].sort(),
  );
  const [month, setMonth] = useState(() =>
    monthFrom(dateInZone(new Date(), timezone)),
  );
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [booked, setBooked] = useState<MeetingConfirmation | null>(null);
  const [step, setStep] = useState<"details" | "schedule" | "review">(
    "details",
  );
  const inFlight = useRef(false);
  const payload = useRef<MeetingInput | null>(null);
  const status = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const detailsPanel = useRef<HTMLFieldSetElement>(null);
  const stepTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!active || pending || booked || step === "review") return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    async function load() {
      try {
        // Include both timezone edges of the month, splitting any 32/33 day
        // interval so each server request stays within its 31-day limit.
        const start = Math.max(month.getTime() - dayMs, Date.now() + 60000);
        const end = Date.UTC(
          month.getUTCFullYear(),
          month.getUTCMonth() + 1,
          2,
        );
        const parts: Availability[] = [];
        for (let cursor = start; cursor < end; cursor += 31 * dayMs) {
          const query = new URLSearchParams({
            start: new Date(cursor).toISOString(),
            end: new Date(Math.min(cursor + 31 * dayMs, end)).toISOString(),
            timezone,
          });
          parts.push(await fetchAvailability(query, controller.signal));
        }
        if (!controller.signal.aborted) {
          const first = parts[0];
          if (!first) {
            throw new Error("This month has passed. Choose an upcoming month.");
          }
          const slots = [
            ...new Map(
              parts
                .flatMap((part) => part.slots)
                .map((slot) => [slot.startTime, slot]),
            ).values(),
          ].sort((a, b) => a.startTime.localeCompare(b.startTime));
          setData({ ...first, slots });
          setDate((current) =>
            slots.some((slot) => slot.date === current) ? current : "",
          );
          setStartTime((current) =>
            slots.some((slot) => slot.startTime === current) ? current : "",
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          // Keep question fields mounted so a refresh/outage cannot discard
          // the visitor's answers. Only the unavailable slots are cleared.
          setData((current) => (current ? { ...current, slots: [] } : null));
          setDate("");
          setStartTime("");
          setLoadError(error instanceof Error ? error.message : defaultError);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [month, timezone, revision, active, pending, booked, step]);
  useEffect(() => {
    if (booked && active) {
      result.current?.focus({ preventScroll: true });
      result.current
        ?.closest<HTMLElement>(".booking-content")
        ?.scrollTo({ top: 0 });
    }
  }, [booked, active]);
  useEffect(() => {
    if (!active) return;
    stepTitle.current?.focus({ preventScroll: true });
    stepTitle.current
      ?.closest<HTMLElement>(".booking-content")
      ?.scrollTo({ top: 0 });
  }, [step, active]);

  function validateDetails(form: HTMLFormElement) {
    const fields = [
      ...(detailsPanel.current?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea") || []),
    ];
    fields.forEach((field) => field.setCustomValidity(""));
    const values = new FormData(form);
    const parsed = meetingDetailsInput.safeParse({
      name: String(values.get("name") || ""),
      email: String(values.get("email") || ""),
      phone: String(values.get("phone") || ""),
      company: String(values.get("company") || ""),
      message: String(values.get("message") || ""),
      projectType: String(values.get("projectType") || ""),
    });
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        fields
          .find((field) => field.name === issue.path[0])
          ?.setCustomValidity(issue.message);
    const invalid = fields.find((field) => !field.checkValidity());
    if (invalid) {
      setError(invalid.validationMessage);
      setStep("details");
      requestAnimationFrame(() => invalid.reportValidity());
      return null;
    }
    return parsed.success ? parsed.data : null;
  }
  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || booked || pending) return;
    if (step === "review") {
      void submit();
      return;
    }
    const details = validateDetails(event.currentTarget);
    if (!details) return;
    setError("");
    if (step === "details") {
      setStep("schedule");
      return;
    }
    if (
      !data?.slots.some((slot) => slot.startTime === startTime) ||
      Date.parse(startTime) <= Date.now() + 60000
    ) {
      setError("Choose an available date and time.");
      return;
    }
    const form = new FormData(event.currentTarget);
    payload.current = {
      ...details,
      requestId: crypto.randomUUID(),
      startTime,
      timezone,
      answers: data.questions
        .filter((question) => !question.field)
        .map((question) => ({
          position: question.position,
          answer:
            question.type === "multi_select"
              ? form
                  .getAll(`answer-${question.position}`)
                  .map(String)
                  .join("\n")
              : String(form.get(`answer-${question.position}`) || ""),
        })),
    };
    setStep("review");
  }
  async function submit() {
    if (inFlight.current || booked) return;
    if (!payload.current) return;
    // Ref closes the double-tap window before React commits the disabled button.
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const response = await fetch("/api/meetings/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(45000),
      });
      const body = await response.json();
      if (response.status === 202 && body.pending) {
        setPending(true);
        setError(body.message);
        return;
      }
      if (!response.ok) {
        // These codes are emitted only after the server has resolved the old
        // request. Other failures retain its ID to avoid duplicate bookings.
        const resolved =
          (response.status === 400 && body.code === "SLOT_EXPIRED") ||
          (response.status === 409 && body.code === "BOOKING_CANCELLED");
        if (pending && !resolved) {
          setError(
            body.error ||
              "We couldn't check confirmation yet. Please try again.",
          );
          return;
        }
        if (response.status >= 500) {
          setPending(true);
          setError(
            "We couldn't check confirmation yet. Please try again or contact us before booking another time.",
          );
          return;
        }
        setPending(false);
        payload.current = null;
        setStep(response.status === 400 && !resolved ? "details" : "schedule");
        if (
          response.status === 409 ||
          resolved ||
          (response.status === 400 &&
            body.error === "Choose a future available time.")
        ) {
          setStartTime("");
          setRevision((value) => value + 1);
        }
        setError(
          body.error ||
            "We couldn't schedule the meeting right now. Please try again.",
        );
        return;
      }
      if (!body.booking?.startTime || !body.booking?.name)
        throw new Error("Invalid confirmation");
      setBooked(body.booking);
      setPending(false);
      payload.current = null;
    } catch {
      // A lost response can follow a successful booking. Keep the same payload
      // and request ID: the backend reconciles instead of creating another event.
      setPending(true);
      setError(
        "The connection was interrupted. Check confirmation before trying another time.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusy(false);
      if (!booked) requestAnimationFrame(() => status.current?.focus());
    }
  }
  if (booked)
    return (
      <div className="meeting-confirmation" ref={result} tabIndex={-1}>
        <span className="meeting-success-mark" aria-hidden="true">
          ✓
        </span>
        <h2>Meeting Confirmed</h2>
        <p>We look forward to speaking with you, {booked.name}.</p>
        <dl>
          <dt>Date</dt>
          <dd>{displayDate(dateInZone(booked.startTime, booked.timezone))}</dd>
          <dt>Time</dt>
          <dd>{displayTime(booked.startTime, booked.timezone)}</dd>
          <dt>Timezone</dt>
          <dd>{booked.timezone}</dd>
        </dl>
        <p>
          Your meeting has been scheduled successfully. Your invitation will
          arrive by email.
        </p>
        <div className="meeting-success-actions">
          <FabricButton onClick={onDone}>Done</FabricButton>
        </div>
      </div>
    );
  const currentMonth = monthFrom(dateInZone(new Date(), timezone));
  const monthKey = month.toISOString().slice(0, 7);
  const futureSlots =
    data?.slots.filter(
      (slot) => Date.parse(slot.startTime) > Date.now() + 60000,
    ) || [];
  const dates = new Set(
    futureSlots
      .filter((slot) => slot.date.startsWith(monthKey))
      .map((slot) => slot.date),
  );
  const days = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const slots = futureSlots.filter((slot) => slot.date === date);
  const required = (field: MeetingQuestion["field"]) =>
    data?.questions.some(
      (question) => question.field === field && question.required,
    ) ||
    (field === "phone" && data?.phoneRequired) ||
    false;
  const review = payload.current;
  function moveMonth(offset: number) {
    setDate("");
    setStartTime("");
    setMonth(
      (current) =>
        new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1),
        ),
    );
  }
  return (
    <form
      className="meeting-form"
      data-step={step}
      onSubmit={advance}
      noValidate
      onInput={(event) => {
        const field = event.target;
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement
        )
          field.setCustomValidity("");
      }}
    >
      <p className="meeting-intro">
        A thoughtful first conversation. Choose a time that works for you
        {data ? ` for a ${data.duration}-minute meeting` : ""}.
      </p>
      <ol className="meeting-step-list" aria-label="Booking progress">
        {(["details", "schedule", "review"] as const).map((value, index) => (
          <li key={value} aria-current={step === value ? "step" : undefined}>
            <span aria-hidden="true">{index + 1}</span>
            {value === "details"
              ? "Details"
              : value === "schedule"
                ? "Date & time"
                : "Review"}
          </li>
        ))}
      </ol>
      <h2 className="meeting-step-heading" ref={stepTitle} tabIndex={-1}>
        {step === "details"
          ? "Tell us about your meeting"
          : step === "schedule"
            ? "Choose a date and time"
            : "Review your meeting"}
      </h2>
      <fieldset
        className="meeting-details"
        ref={detailsPanel}
        hidden={step !== "details"}
        disabled={busy || pending}
      >
        <legend>Your details</legend>
        <label>
          Full Name *
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          Email *
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Phone Number *
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            required
            placeholder="Include your country code"
          />
        </label>
        <label>
          Company / Organization *
          <input
            name="company"
            autoComplete="organization"
            maxLength={150}
            required
          />
        </label>
        <label>
          <span id="meeting-project-type-label">
            Project Type{required("projectType") ? " *" : ""}
          </span>
          <select
            name="projectType"
            aria-labelledby="meeting-project-type-label"
            required={required("projectType")}
          >
            <option value="">Select a project type</option>
            {[
              "Web Development",
              "Mobile App",
              "AI / ML",
              "Automation",
              "SaaS",
              "Consultation",
              "Other",
            ].map((value) => (
              <option key={value} value={value}>
                {value === "AI / ML" ? "AI & ML" : value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Meeting Purpose *
          <textarea name="message" rows={3} maxLength={2000} required />
        </label>
        {data?.questions
          .filter((question) => !question.field)
          .map((question) => (
            <label key={question.position}>
              <span id={`meeting-question-${question.position}`}>
                {question.name}
                {question.required ? " *" : ""}
              </span>
              {question.type.endsWith("select") ? (
                <select
                  aria-labelledby={`meeting-question-${question.position}`}
                  name={`answer-${question.position}`}
                  required={question.required}
                  multiple={question.type === "multi_select"}
                >
                  {question.type !== "multi_select" && (
                    <option value="">Choose an answer</option>
                  )}
                  {question.choices.map((choice) => (
                    <option key={choice}>{choice}</option>
                  ))}
                </select>
              ) : question.type === "text" ? (
                <textarea
                  name={`answer-${question.position}`}
                  required={question.required}
                  rows={2}
                  maxLength={2000}
                />
              ) : (
                <input
                  name={`answer-${question.position}`}
                  type={question.type === "phone_number" ? "tel" : "text"}
                  required={question.required}
                  maxLength={2000}
                />
              )}
            </label>
          ))}
      </fieldset>
      <fieldset
        className="meeting-schedule"
        hidden={step !== "schedule"}
        disabled={busy || pending}
      >
        <legend>Date &amp; time</legend>
        <label>
          <span id="meeting-timezone-label">Timezone *</span>
          <select
            aria-labelledby="meeting-timezone-label"
            value={timezone}
            onChange={(event) => {
              setDate("");
              setStartTime("");
              setTimezone(event.target.value);
            }}
          >
            {zones.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
        <div className="meeting-calendar" aria-busy={loading}>
          <div className="meeting-month">
            <button
              type="button"
              aria-label="Previous month"
              disabled={month <= currentMonth || loading}
              onClick={() => moveMonth(-1)}
            >
              ←
            </button>
            <h3>
              {new Intl.DateTimeFormat("en", {
                timeZone: "UTC",
                month: "long",
                year: "numeric",
              }).format(month)}
            </h3>
            <button
              type="button"
              aria-label="Next month"
              disabled={
                month.getTime() >= currentMonth.getTime() + 335 * dayMs ||
                loading
              }
              onClick={() => moveMonth(1)}
            >
              →
            </button>
          </div>
          <div className="meeting-weekdays" aria-hidden="true">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>
          <div
            className="meeting-days"
            role="group"
            aria-label="Available dates"
          >
            {Array.from({ length: month.getUTCDay() }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
              return (
                <button
                  type="button"
                  key={key}
                  aria-label={displayDate(key)}
                  aria-pressed={date === key}
                  disabled={loading || !!loadError || !dates.has(key)}
                  data-available={dates.has(key)}
                  onClick={() => {
                    setDate(key);
                    setStartTime("");
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
        <div className="meeting-availability-status" aria-live="polite">
          {loading ? (
            <p>Finding available times...</p>
          ) : loadError ? (
            <>
              <p role="alert">{loadError}</p>
              <FabricButton
                variant="secondary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Try again
              </FabricButton>
              <a href={`mailto:${contactEmail}`}>Email Quiet Logic</a>
            </>
          ) : !dates.size ? (
            <p>No available dates this month. Try the next month.</p>
          ) : (
            <p>
              {date
                ? displayDate(date)
                : "Choose an available date to see times."}
            </p>
          )}
        </div>
        <div
          className="meeting-times"
          role="group"
          aria-label="Available times"
        >
          {slots.map((slot) => (
            <button
              type="button"
              key={slot.startTime}
              disabled={loading || !!loadError}
              aria-pressed={startTime === slot.startTime}
              onClick={() => setStartTime(slot.startTime)}
            >
              {displayTime(slot.startTime, timezone)}
            </button>
          ))}
        </div>
      </fieldset>
      {step === "review" && review && (
        <section className="meeting-review" aria-label="Booking review">
          <dl>
            <dt>Name</dt>
            <dd>{review.name}</dd>
            <dt>Email</dt>
            <dd>{review.email}</dd>
            <dt>Phone</dt>
            <dd>{review.phone}</dd>
            <dt>Company / Organization</dt>
            <dd>{review.company}</dd>
            <dt>Date</dt>
            <dd>
              {displayDate(dateInZone(review.startTime, review.timezone))}
            </dd>
            <dt>Time</dt>
            <dd>{displayTime(review.startTime, review.timezone)}</dd>
            <dt>Timezone</dt>
            <dd>{review.timezone}</dd>
            {review.projectType && (
              <>
                <dt>Project Type</dt>
                <dd>
                  {review.projectType === "AI / ML"
                    ? "AI & ML"
                    : review.projectType}
                </dd>
              </>
            )}
            <dt>Meeting Purpose</dt>
            <dd className="meeting-review-purpose">{review.message}</dd>
            {data?.questions
              .filter((question) => !question.field)
              .map((question) => (
                <div className="meeting-review-answer" key={question.position}>
                  <dt>{question.name}</dt>
                  <dd>
                    {review.answers.find(
                      (answer) => answer.position === question.position,
                    )?.answer || "—"}
                  </dd>
                </div>
              ))}
          </dl>
          <p>
            Check your details before confirming. Your time will be checked
            again when you confirm.
          </p>
        </section>
      )}
      <div className="meeting-submit">
        <div ref={status} tabIndex={-1} role={error ? "alert" : "status"}>
          {error ||
            (step !== "details" && startTime
              ? `${displayDate(date)} · ${displayTime(startTime, timezone)} · ${timezone}`
              : step === "details"
                ? "Required fields are marked *."
                : "Select an available date and time to continue.")}
        </div>
        <div className="meeting-step-actions">
          {step !== "details" && (
            <FabricButton
              variant="secondary"
              arrow={false}
              disabled={busy || pending}
              onClick={() => {
                payload.current = null;
                setError("");
                setStep(step === "review" ? "schedule" : "details");
              }}
            >
              <span aria-hidden="true">← </span>Back
            </FabricButton>
          )}
          {pending ? (
            <FabricButton
              type="button"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Checking confirmation..." : "Check confirmation"}
            </FabricButton>
          ) : (
            <FabricButton
              type="submit"
              disabled={
                busy ||
                (step === "schedule" && (loading || !startTime || !!loadError))
              }
            >
              {busy
                ? "Booking your meeting..."
                : step === "details"
                  ? "Continue"
                  : step === "schedule"
                    ? "Review Meeting"
                    : "Confirm Meeting"}
            </FabricButton>
          )}
        </div>
        <small>Your details are used to arrange this meeting.</small>
      </div>
    </form>
  );
}
