# Quiet Logic site audit — 2026-10-26

The existing project was checked through a production build, lint, TypeScript, isolated database/email tests and browser regressions. Existing source changes, credentials, content and QA assets were preserved. No real meeting was created and no email was sent externally.

## Issues fixed

### Booking availability stayed stale after reopening

The booking dialog stays mounted to preserve drafts and uncertain request IDs. Its availability effect previously ignored whether the dialog was open, so reopening the calendar could reuse an old snapshot indefinitely.

The form now receives its active state from the provider. It refreshes when reopening or returning to date selection, aborts requests when hidden, and retains a selected slot only if it is still available. Timezone/month changes explicitly reset the selection. Pending requests and confirmation screens keep their original request identity.

### An expired pending request could leave the form locked

After a connection failure, the form correctly preserved its request ID. However, it also stayed locked when a later server response definitively reported that no attempt existed and the selected time had expired, or that the previous meeting was cancelled.

The server now returns explicit `SLOT_EXPIRED` and `BOOKING_CANCELLED` codes for those resolved states. The client releases its pending state only for those codes with their expected HTTP statuses, refreshes slots and enables date selection again. Rate limits, provider errors and ambiguous failures still retain the request ID to prevent duplicate bookings.

### A stalled availability request could show loading indefinitely

Availability requests now have a 20-second deadline and a friendly retry message. Each request removes its abort listener and clears its timer. Closing the dialog aborts the request. Malformed JSON and network failures use a clean visitor-facing message.

### Refreshes could discard extra meeting answers

Question fields now stay mounted during availability refreshes. Failed requests clear only the unavailable slots, preserving entered answers and client details. Calendar controls remain disabled while data is loading or unavailable. A regression check covers required custom answers through calendar refresh, review and Back.

### Shared database operations emitted deprecation warnings

The rate limiter now uses `returnDocument: "after"` in place of deprecated `new: true`, preserving its atomic counting and duplicate-key retry behavior. This follows the current [Mongoose documentation](https://mongoosejs.com/docs/tutorials/findoneandupdate.html).

### Email configuration was incomplete

The local Gmail host, TLS port, sender and account settings were configured for `company.quitelogic@gmail.com`. The owner saved the app password directly in the ignored `.env.local` file. Gmail connection, TLS and authentication were verified without sending an email.

The mailer now rejects partial credentials before opening a network connection. The new `npm run email:check` command checks configuration and authenticates without delivering mail or printing credentials. The integration suite verifies that missing SMTP authentication returns an error without attempting a mail connection.

Local application and reset-link origins are explicitly `http://localhost:3000`. Production hosting must use its actual HTTPS origin for `APP_URL` and `NEXT_PUBLIC_SITE_URL`; local values should not be copied to production.

## Validation and scope

- Production build, ESLint, TypeScript and formatting checks.
- 27 isolated meeting checks, including ten simultaneous clients, overlapping starts, idempotency, stale-slot validation, recovery codes and provider failures.
- 10 avatar validation, crop, storage and privacy checks.
- Full integration coverage using disposable MongoDB and a local SMTP sink for account/session lifecycle, password reset, uploads, moderation, portfolio/social management and contact delivery/failures.
- The full run passed 350 integration assertions and 97 browser regression tests. After rebuilding the final form, all 12 focused booking checks also passed, including the additional custom-answer/timezone regression.
- Browser checks at 320, 375, 390, 425, 768, 1024, 1280 and 1440px, including Day/Night persistence, floating/water header, navigation, glass/clay surfaces, booking review/recovery, graph lifecycle, services cube, portfolio and SEO.
- Gmail SMTP authentication checked against the real provider without email delivery. Calendar write operations were mocked; no real appointments were created.
- The running local homepage and availability endpoint both returned HTTP 200. Live availability returned 72 slots across the next seven days for Asia/Karachi.

Regression tests first reproduced stale reopening, an unrecoverable expired pending request and indefinite availability loading. Those tests passed after the fixes. A further check covers preservation of required custom answers during refresh.

No deployment was performed. The real inbox-delivery path and paid Calendly booking creation require deliberate external acceptance tests; this audit did not send a message or create an appointment.

All 293 pre-existing QA/generated files were restored byte-for-byte after the tests. Client bundle inspection found no Calendly or SMTP server credentials/configuration identifiers.
