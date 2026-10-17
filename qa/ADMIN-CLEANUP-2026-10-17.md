# Admin cleanup — 17 October 2026

## Changes

- Removed the admin email composer, replies, outbound history UI, email send/reply API routes, client Write Email links and dashboard SMTP status.
- Removed the unused AdminInbox component, inbox/outbound/validation helpers and inbox-only CSS.
- Replaced the old Inbox with searchable, paginated, read-only Contact Messages. Only website contact submissions are listed. Client details retain contact submissions and reviews.
- `/admin/inbox` redirects to `/admin/messages`; existing stored messages and historical email records are preserved. No database schema changes or production data mutations were needed.
- Public contact notifications, password recovery, existing signed inbound webhook, Calendly, reviews, portfolio and public motion/design remain supported. The webhook is separate from the removed admin email interface; inbound email operations now require the provider interface.

## Bugs fixed

- Login trims/lowercases email before validation, accepting accidentally pasted surrounding spaces.
- Malformed stored password hashes return invalid credentials rather than throwing an unexpected server error; dummy scrypt verification remains in the failure path.
- Command-line admin setup now enforces the same password-strength criteria as the account forms and invalidates outstanding password-reset tokens as well as sessions.
- The login page now displays an availability explanation when an admin session database lookup redirects with `?unavailable=1`.
- Invalid review-status filter values return a validation error.
- Removed stale generated development route types after deleting API routes so the production type check reflects current source.

## Validation

- Production build and TypeScript: passed.
- Full disposable-database/provider-fixture suite: 46 passed, one new test failed because its fixture omitted a required client record. Corrected that fixture and reran the affected test: passed. All 47 unique browser/API checks passed across those runs.
- Two safe-diagnostic Node tests: passed.
- Coverage includes login normalization, invalid hashes, rate limiting, session revocation, password reset/change/bootstrap recovery, removed send endpoints, contact-only search, mobile admin layouts, portfolio CRUD/uploads/publishing, review moderation, public contact handling, webhook verification, SEO, navigation and existing animations.
- No live email was sent and no real admin password was changed. Tests used a disposable PostgreSQL-compatible database and isolated SMTP provider.

## Deployment limits

These changes are local and have not been deployed to Hostinger. Production database settings remain independent of `.env.local`. Hostinger must use the same Supabase `DATABASE_URL` and the latest TLS helper. Existing hosted 503s cannot be declared resolved without a successful hosted retest. Sender verification for `quitelogic.com` remains necessary for the retained contact/recovery email features. Passing these checks does not establish the absence of every possible bug.
