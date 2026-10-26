# Native Quiet Logic booking and floating theme control

This update refines the existing implementation. It does not add a second scheduler, booking collection, theme provider or authentication system.

## Theme control

One shared theme button now lives beside the root providers, outside the public and Admin headers. It stays fixed at bottom-left: 24px from desktop edges and 16px on phones, plus the device safe-area insets. Its 48px target switches Day/Night immediately with the existing persisted preference and pre-paint theme handling. The icon transitions for 220ms and respects reduced motion. Day uses the existing clay surface; Night uses a subtle glass surface.

Header controls realign without a placeholder. The existing water animation, compact scroll behavior, active indicator and Fabric booking button are preserved. Footer and Admin bottom spacing reserve room for the floating control while retaining their existing backgrounds. When a modal owns focus, the floating button is temporarily hidden so it cannot cover the form or bypass the modal's focus trap. It returns when the modal closes.

## Fully native booking presentation

Every existing Book a Meeting trigger opens the same Quiet Logic dialog:

1. **Details:** required full name, email, phone, company/organization and meeting purpose. Project Type remains optional and now includes Consultation.
2. **Date & time:** the existing custom month calendar, real available-date buttons, available slots and a visible/changeable IANA timezone.
3. **Review:** name, email, phone, company, date, time, timezone, purpose and any configured extra answers. Back preserves the draft and selected slot. No booking POST occurs before the final Confirm Meeting action.
4. **Confirmation:** shown only after the backend verifies a successful booking. The website shows only Quiet Logic text, without provider branding, external booking links, an iframe, popup or redirect.

Client-side validation and the strict backend schema both require the five client fields. Normalized data is shown for review before submission. Invalid or stale bookings return friendly errors and return the visitor to the appropriate step. A lost response preserves the request ID; confirmation checks reuse that exact payload, including after closing/reopening the dialog or receiving a rate-limit response.

Public confirmation DTOs contain only name, UTC start/end and the chosen timezone. Provider event/invitee identifiers and management URLs remain in the existing server-side record and are not returned to visitors. No duplicate confirmation email is added.

## Existing backend protection retained

`GET /api/meetings/availability` obtains availability server-side, validates future ranges of at most 31 days, and returns normalized slots and safe form metadata. The frontend neither invents times nor supplies an event type or provider credentials.

`POST /api/meetings/book` validates origin, request size, input and rate limits; acquires the existing atomic host lease/unique slot hold; rechecks the selected Calendly slot; and creates the invitee server-side. Request fingerprints and unique IDs prevent duplicates across processes. Ambiguous external submissions remain pending and are reconciled through provider reads rather than blindly retried. Success is never inferred from selecting a slot or submitting the form.

Admin → Meetings uses the existing collection and authentication. Its displayed statuses are Upcoming, In Progress, Completed and Cancelled, with a separate awaiting-confirmation state. UTC start/end boundaries determine the labels; the displayed clock updates every 30 seconds. Check calendar retains the existing authenticated reconciliation action.

## Live configuration

At implementation time the local environment had no access token or event-type URI. The owner has since configured the token and the correct event type, and live availability has been verified. Paid booking access has not been tested by creating a real appointment. [Calendly requires Standard or above for direct invitee creation](https://developer.calendly.com/api-docs/calendly-api/scheduled-events/create-event-invitee); Free returns 403.

After verifying the eligible account, set these server-only runtime variables and restart:

```dotenv
CALENDLY_ACCESS_TOKEN=
CALENDLY_EVENT_TYPE_URI=https://api.calendly.com/event_types/YOUR_EVENT_TYPE_ID
CALENDLY_SCHEDULING_ENABLED=true
```

Keep tokens out of Git and all `NEXT_PUBLIC_` variables. The token needs the documented availability/event-type read permissions and scheduled-event write permission. The integration supports the existing individual one-to-one event configuration; see the earlier [backend configuration notes](CUSTOM-MEETING-REPORT.md) for supported locations and event types.

No real appointments were created. The remaining external acceptance check is to confirm account eligibility, deliberately book one test slot on Quiet Logic, and verify the resulting appointment/invitation in the provider account. See the latest [site audit](SITE-AUDIT-REPORT.md) for subsequent recovery fixes and Gmail verification.

## Verification

The isolated meeting suite covers 25 checks: validation, private confirmation data, stale slots, ten simultaneous clients, overlapping starts, idempotency, Free-plan rejection, uncertain-response reconciliation, required questions and Admin status boundaries. Browser checks cover required fields, review and Back, duplicate clicks, pending requests, calendar errors, timezone display and both themes at 320, 375, 390, 425, 768, 1024, 1280 and 1440px.

Tests use disposable MongoDB/local SMTP and mocked scheduling transport or availability. Existing QA artifacts are preserved. New previews are stored in `qa/native-booking/`.

Completed checks: production build, lint, TypeScript and formatting; 25 isolated meeting checks; 347 core integration assertions; and 20 focused browser checks across the final verification runs. The broader browser run also exercised portfolio, reviews, profile uploads, graph lifecycle, the services cube and SEO. A footer overlap found during that run was fixed with a narrow gutter for stacked footer actions; header route measurements now wait for the preserved entrance animation to finish. The contact-delivery check passed with the local SMTP sink enabled.

Client bundle inspection found no Calendly credentials, event-type configuration or provider URLs. Sixteen desktop/mobile Day/Night previews cover the home control and the Details, Calendar and Review screens. All 277 pre-existing QA/generated files were preserved byte-for-byte.
