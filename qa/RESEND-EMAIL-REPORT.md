# Resend email verification — 2026-10-17

Implemented in the existing Next.js 16.4.1 App Router / TypeScript / PostgreSQL site. No separate backend, database replacement, or public-site redesign. Official address: contact@quitelogic.com.

## Results

- `npm.cmd run build`: passed, including all existing public routes and new email API routes.
- `npm.cmd run typecheck`: passed.
- Full Playwright regression run with isolated PostgreSQL and captured provider HTTP: **40 passed**.
- After the final Inbox list-height/empty-detail usability adjustment: **4/4 Resend integration tests passed** on a fresh fixture and rebuilt application.
- Missing-provider configuration variant: **1/1 contact/admin test passed**, confirming saved inquiry, friendly failure, disabled sending UI, preserved clients, and mobile usability.
- Database migration 003: successfully applied to the configured hosted PostgreSQL database; existing records/admin retained. No admin password reset performed.
- Configured secret values scanned against `.next/static`: **0 matches**. `.env.example` contains placeholders for credentials. No obsolete Gmail/Nodemailer workflow references remain in application code or active setup documentation.

## Email and security coverage

- Existing form plus minimal name/email/message payload; optional subject and existing project fields.
- Trimming, missing/invalid/oversized fields, whitespace-only values, unknown objects, malformed JSON, honeypot, subject header injection, wrong method, and rate limiting.
- Official verified-domain From/To, customer Reply-To, HTML escaping, text and HTML templates.
- Provider acceptance, explicit provider rejection, persisted failure state, contact idempotency, retry conflict, and notification-loop duplicate prevention.
- Webhook raw-body verification using the actual Resend SDK; missing/invalid/stale signatures, signed malformed JSON, unsupported events, fetched inbound content, HTML-only conversion, duplicate event/message/RFC IDs, provider failure, database failure, and successful retry.
- Authentication on every Inbox endpoint; CSRF/origin rejection; message detail without raw HTML; search, read/unread, status filters, 25-item pagination, archive, soft delete without client deletion.
- Reply failure leaves original status unchanged; successful reply stores history and updates status; threading headers; Re: prefix behavior; compose validation and idempotency; existing client names/company preserved.
- Existing password recovery, reset expiry/replay, change-password/session revocation, review moderation, portfolio CRUD/images/publishing, public routing/SEO, Calendly, cursor, motion, and responsive layout regressions.
- Screenshots reviewed at mobile/tablet/desktop widths. No horizontal page overflow or unexpected browser page errors in tested workflows. Inbox controls were adjusted after screenshot review to avoid tablet crowding.

The provider fixture intercepts only HTTP inside the disposable test server. It uses the real Resend SDK, official webhook signature verification, real production route handlers, and the production pg adapter. All fixture email addresses and secrets are disposable test values. No live customer email was sent.

## External setup still required

At the environment audit, RESEND_API_KEY was present but lacked the expected Resend key prefix, RESEND_WEBHOOK_SECRET was missing, and NEXT_PUBLIC_SITE_URL was unset. Sending/receiving DNS was not changed or verified through this session. Therefore **live sending, real receiving, and inbox delivery are not claimed verified**.

Follow [RESEND-SETUP.md](../RESEND-SETUP.md) for exact manual Resend/DNS/Hostinger setup and send/receive/reply acceptance tests. It includes the file inventory, migration command, API routes, environment variables, security behavior, and remaining deployment tasks.

Screenshots: `qa/screenshots/resend-inbox-mobile.png`, `qa/screenshots/resend-inbox-desktop.png`.
