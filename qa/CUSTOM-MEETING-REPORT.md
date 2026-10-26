# Quiet Logic theme, hero and custom meetings

The shared theme control now switches Day/Night immediately with one click. The public floating header and Admin headers use the same component; the previous menu and global floating popover button are removed. Existing localStorage, system preference and pre-paint theme handling remain in place. The two icon layers transition for 220ms and respect reduced motion.

The Home hero now includes an oversized vector version of the existing Q mark behind the text and actions. It has no layout footprint or pointer interaction. Opacity is 0.065 in Day and 0.08 in Night, reduced on mobile. Its autonomous 12-second motion freezes under reduced motion. Existing graph, hero text, glass surface, CTAs and water header remain.

## Calendly account setup

The current local environment has neither `CALENDLY_ACCESS_TOKEN` nor `CALENDLY_EVENT_TYPE_URI`. The owner reports a Free or uncertain plan. Live direct booking is therefore **not verified or enabled**. No real appointments were created during development.

[Calendly's Scheduling API documentation](https://developer.calendly.com/api-docs/calendly-api/scheduled-events/create-event-invitee) requires Standard or above for `POST /invitees`; Free returns 403. The application handles this as an unavailable calendar, never a successful booking.

After confirming the paid plan and token permissions, configure these **server-only** runtime variables:

```dotenv
CALENDLY_ACCESS_TOKEN=
CALENDLY_EVENT_TYPE_URI=https://api.calendly.com/event_types/YOUR_EVENT_TYPE_ID
CALENDLY_SCHEDULING_ENABLED=true
```

Do not place credentials in `NEXT_PUBLIC_` variables or commit them. `CALENDLY_SCHEDULING_ENABLED` defaults to disabled and should only be enabled after confirming eligibility. Token permissions must include `event_types:read`, `availability:read`, and `scheduled_events:write` (which includes event reads); see [Calendly scopes](https://developer.calendly.com/docs/authentication/scopes). Restart the application after changing runtime variables.

Use a standard individual, active one-to-one event with a single configured location (or no location). Multiple locations, group/team/round-robin event types and unsupported required custom-question types fail closed with a clear contact option. Zoom, Google Meet, Teams, Webex, GoToMeeting, phone, physical and custom locations are supported. Phone calls that require an invitee number validate that field. Enabled Calendly questions are mapped to existing form fields or displayed with the configured answer choices. Required questions are also validated on the server.

The browser remains on Quiet Logic. Every existing Book a Meeting button opens the same custom dialog; no Calendly iframe/script is loaded and no token is sent to the browser. The dialog detects and exposes an IANA timezone, fetches actual available slots, and supports client details, company, phone, message and project type. Unconfigured calendars show an honest unavailable state and email contact option.

## Routes and data integrity

- `GET /api/meetings/availability?start=...&end=...&timezone=...` validates a future interval of at most 31 days and calls Calendly server-side. The calendar splits wider month boundaries into valid requests. Only actual available slots and safe form metadata are returned.
- `POST /api/meetings/book` validates a strict JSON schema, origin, bounded body and rate limits. The configured server event type cannot be overridden by the browser. It rechecks the exact selected slot immediately before `POST /invitees`.
- MongoDB uses unique request IDs, unique active event-type/start pairs and an atomic short host lease. The lease also serializes overlapping start times across application workers. Pre-submission holds expire; a successful or uncertain external submission never expires automatically. Calendly remains responsible for conflicts with bookings outside Quiet Logic.
- A request fingerprint prevents reusing an ID with different details. Confirmed replays return the existing confirmation. A timed-out or ambiguous Calendly request keeps the same ID and a pending hold; a retry reads Calendly's event/invitee records and matches the request ID in tracking rather than repeating the booking POST. Pending confirmation never displays Meeting Confirmed.
- An unfinished form stays in memory when its dialog closes, including pending requests and their IDs; reopening resumes that form. Completing a confirmed booking starts a fresh form on the next opening. No client details or request payloads are written to localStorage. Full page reloads cannot restore an in-memory request; the MongoDB slot hold still prevents a duplicate submission, and Admin can reconcile it.
- Success requires an active Calendly invitee and matching active event, event type, client email and start time. The confirmed event is saved to MongoDB. Reschedule/cancel links are included only for valid Calendly HTTPS URLs. Calendly owns invitation/workflow email; no duplicate SMTP email is added.
- Admin → Meetings lists Quiet Logic bookings and pending confirmations with client details, time, timezone and status. Its authenticated, origin-protected Check Calendly action reconciles pending confirmations and updates cancelled/rescheduled invitees. List refresh reads local records; this is not a webhook-based mirror of all Calendly activity.

If a pending booking remains unresolved, check the host's Calendly account before manually releasing its hold. Never assume a timeout means no event was created. No automatic retry of an uncertain POST is performed.

## Validation

`npm run test:meetings` runs isolated tests with disposable MongoDB and mocked Calendly transport. It covers validation, trusted configuration, origin enforcement, range limits, final slot checks, idempotency, ten simultaneous clients, overlapping starts, paid-plan rejection, uncertain response recovery, management URL safety, required questions and admin reconciliation.

Playwright coverage in `tests/booking.spec.ts`, `tests/brand-hero.spec.ts`, `tests/experience-upgrade.spec.ts`, `tests/themes.spec.ts` and `tests/crystal-contact.spec.ts` verifies custom form behavior, duplicate taps, errors, confirmation, timezone display, one-click switching, persistence and hero stacking. Responsive matrices include 1440, 1280, 1024, 768, 425, 390, 375 and 320px in both modes.

Completed validation: production build, lint and TypeScript checks; 23 isolated meeting checks; 348 existing integration assertions and 92 browser regression tests. After adding pending-form retention and rate-limit recovery, all 15 focused booking/header/water checks passed. Eight desktop/mobile Day/Night previews are in `qa/custom-meeting/`. Tests used disposable MongoDB and local SMTP; calendar transport and UI availability were mocked. Existing QA snapshots were preserved.

Once an eligible account is configured, complete the real acceptance check: select a genuine slot on Quiet Logic, submit one deliberate test booking, confirm the success screen and verify the appointment/invitation in Calendly. Also verify real conflict behavior from two browsers and returned management links. These external checks remain outstanding until the account is eligible and configured.
