# Quiet Logic email setup and delivery report

> **Current outgoing email:** Resend SMTP is now used through Nodemailer. See [SMTP-SETUP.md](./SMTP-SETUP.md) for the active configuration and domain verification checklist. The signed Resend inbound webhook remains in use. SMTP does not provide the HTTP API idempotency guarantee described in the original implementation; uncertain sends are held for manual review.


## Architecture and implementation

The existing site uses Next.js 16.4.1 App Router, React 19, TypeScript, Next.js Route Handlers, Zod, and PostgreSQL through `pg` (no ORM). It retains its existing salted-scrypt admin authentication, hashed sessions, persistent rate limits, portfolio, reviews, public pages, motion, SEO, and Calendly. Deployment target: Hostinger Business Node.js hosting, Node 24. The existing PostgreSQL provider is retained; no database-provider migration or second backend was introduced.

The single official address is **contact@quitelogic.com**. Gmail SMTP and its notification fallback were removed. Contact notifications, admin compose/replies, and password-reset email all use one server-only Resend SDK client.

Contact form → validated same-origin POST → existing PostgreSQL `messages` table → Resend notification. The original visitor's email is Reply-To; it is never From. Sending and receiving at the same address do not create duplicate Inbox entries: form notifications carry an authenticated marker recognized by the inbound handler.

Direct email → Resend receiving domain → signed `email.received` webhook → Receiving API body retrieval → existing messages table → authenticated Admin Inbox. Replies store history, use the original RFC Message-ID in In-Reply-To/References when available, and mark the inquiry replied after provider acceptance. Sent means provider acceptance, not guaranteed final delivery. No automatic replies are sent to inbound email.

## Files and packages

Added:

- `lib/email/config.ts`, `resend.ts`, `templates.ts`, `validation.ts`, `contact.ts`, `outbound.ts`, `inbox.ts`.
- `database/003-email-inbox.sql`.
- `app/api/admin/emails/route.ts`, `[id]/route.ts`, `[id]/[action]/route.ts`.
- `app/api/webhooks/resend/route.ts`.
- `components/admin/AdminInbox.tsx`, `tests/resend-inbox.spec.ts`, this guide.

Modified: contact schema/form/API; company contact address; AdminPanel and admin section allowlist; existing admin API compatibility handlers; forgot-password sender; admin styles; Next.js server external configuration; `.env.example`, `.gitignore`, package manifest/lock; provider test fixture; contact, account, review/admin, and public regression tests; README and ADMIN-SETUP documentation.

Removed: `lib/gmail.ts`, `lib/contact-delivery.ts`, obsolete Nodemailer fixture. Added runtime packages `resend`, `html-to-text`; development types `@types/html-to-text`. Removed `nodemailer` and `@types/nodemailer`.

## Private environment configuration

Copy the placeholders from `.env.example` into private `.env.local` for local development, or Hostinger's environment-variable settings for production:

```dotenv
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM="Quiet Logic <contact@quitelogic.com>"
EMAIL_TO=contact@quitelogic.com
EMAIL_REPLY_FROM="Quiet Logic <contact@quitelogic.com>"
DATABASE_URL=
NEXT_PUBLIC_SITE_URL=https://quitelogic.com
# Optional additional exact trusted public origins, comma-separated:
ALLOWED_ORIGINS=
```

Use a Resend API key permitted to send email **and retrieve received email content**; a sending-only key cannot perform all inbound operations. Keep it server-only. Sender variables may use a different verified sender in development; production should use the official values above. No `AUTH_SECRET` or new authentication provider is required by the existing opaque-session system. `NEXT_PUBLIC_SITE_URL` is the existing application URL setting; there is no separate `APP_URL` requirement.

Never put secrets in NEXT_PUBLIC variables, Git, client props, chat, example files, or deployment ZIPs. `.env` and `.env.*` are ignored except the placeholder-only `.env.example`. Previously populated credentials in `.env.example` were removed; rotate any credentials that were committed, shared, or otherwise exposed. Existing private values were not copied into this guide or example.

For Hostinger, use Web App / Next.js / Node 24, install from the lockfile, build with `npm run build`, and use the detected Next.js server/start command (`npm start` when a start command is requested). Configure the environment before building; NEXT_PUBLIC_SITE_URL is used by SEO at build time. This app needs a running Next.js server, not a static export. Keep PostgreSQL external (Neon, Supabase session pooler, or another PostgreSQL service). Configure the canonical HTTPS origin explicitly behind Hostinger's proxy. Add a second www/non-www origin to ALLOWED_ORIGINS only if that origin actually serves this app.

## Database migration

```powershell
npm.cmd run db:migrate
```

The additive migration has already been applied to the currently configured database. Run the command again when deploying against a different database. It is transactional and safe to rerun; it preserves existing records and admin accounts. Do not run `admin:setup` again merely to deploy.

Migration 003 extends `messages` with source, sender snapshot, recipient, HTML storage, provider/event/RFC IDs, contact idempotency key, read/status state, received/updated/send timestamps, and soft deletion. Existing inquiries are backfilled. Unique indexes prevent duplicate inbound messages and form retries; status/read/date/sender indexes support pagination. `email_history` gains original-message linkage, provider ID, idempotency key, and send timestamps.

Row-level security protects messages/history from browser-access database APIs. The existing private PostgreSQL owner/server connection must be used by the app; a browser anon key is unsuitable. Do not grant public database API access to private admin, client, session, or email records. The app does not use the Supabase browser SDK.

## Manual Resend and DNS setup

1. Sign in at https://resend.com and open **Domains**.
2. Add **quitelogic.com** and choose the appropriate region.
3. Copy **the exact DNS record names, types, values, and priorities shown by Resend** for sending/domain verification (including DKIM and SPF/return-path records as applicable). This guide intentionally supplies no invented DNS values.
4. Add those records at the domain's authoritative DNS provider. If Hostinger manages DNS, use that domain's DNS zone in hPanel. Preserve unrelated website records.
5. Ask Resend to verify and wait until the sending domain shows verified. A successful build does not verify a domain.
6. Configure EMAIL_FROM and EMAIL_REPLY_FROM as `Quiet Logic <contact@quitelogic.com>` and EMAIL_TO as `contact@quitelogic.com`. Create the server API key and save it privately.
7. For direct receiving, open the verified domain and enable **Receiving**. Copy the exact receiving MX record from Resend into DNS and wait for its verified state. Sending verification and receiving routing are separate requirements.
8. If the root domain already uses Hostinger or another mailbox provider, **plan the MX change first**. MX changes affect the domain's mail routing, not just this address. Do not mix equal-priority competing MX services. Resend documents forwarding to a separately verified receiving domain as an alternative. This implementation expects contact@quitelogic.com among the original recipients; test any forwarding arrangement preserves that recipient. The simplest configured flow is direct Resend receiving for quitelogic.com. No DNS records were changed automatically.
9. Deploy the app over HTTPS. In **Resend → Webhooks**, add `https://quitelogic.com/api/webhooks/resend` (use your actual deployed origin).
10. Subscribe to **email.received**. Other verified events are acknowledged without creating Inbox records. This version does not track subsequent delivery/bounce events as an admin message status.
11. Copy that endpoint's signing secret into private RESEND_WEBHOOK_SECRET. Restart/redeploy the app after environment changes.
12. Submit a clearly labelled contact-form test using an email address you control. Check the success state, Resend sending logs, and Admin Inbox. Inspect From/To/Reply-To.
13. Send a separate direct email from your own mailbox to contact@quitelogic.com. Check Resend Receiving and webhook delivery logs, then open Admin → Inbox. Reply from the Inbox and confirm receipt in your own mailbox.

Inbound receiving is **not active until you complete the domain/MX/webhook steps**. Resend is the programmatic receiving backend; Admin Inbox is the mailbox interface implemented here. Attachments are not downloaded or exposed by this version.

Official references: [domain setup](https://resend.com/docs/dashboard/domains/introduction), [custom receiving domains and MX coexistence](https://resend.com/docs/dashboard/receiving/custom-domains), [raw-body webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [retrieve received content](https://resend.com/docs/dashboard/receiving/get-email-content), [reply threading](https://resend.com/docs/dashboard/receiving/reply-to-emails).

## API routes and security

| Route | Purpose |
| --- | --- |
| POST `/api/contact` | Store validated contact inquiry and send Resend notification |
| GET `/api/admin/emails` | Search/filter/page Inbox and bounded outbound history |
| POST `/api/admin/emails` | Compose to a validated recipient or existing client |
| GET `/api/admin/emails/[id]` | Message detail and the latest 25 reply records |
| POST `/api/admin/emails/[id]/reply` | Send reply and mark replied on success |
| PATCH `/api/admin/emails/[id]/read` | `{ "isRead": true/false }` |
| PATCH `/api/admin/emails/[id]/archive` | `{ "archived": true/false }` |
| DELETE `/api/admin/emails/[id]` | Soft delete; preserve client and reply history |
| POST `/api/webhooks/resend` | Verify signature, retrieve body, deduplicate, persist |

`/admin/inbox` is the new navigation destination. Existing `/admin/messages`, GET `/api/admin/messages`, and POST `/api/admin/email` remain compatibility routes. Existing login/recovery/change-password and all unrelated public/admin routes remain.

Every admin email API authenticates the existing server session. Mutations enforce trusted same-origin requests, payload caps, strict Zod fields, and validated IDs. Queries are parameterized; lists are capped at 25. Admin sends are limited to 30/hour/account. Public contact uses 5/sender and 60/global per 15 minutes, strict schema/length limits, a honeypot, and same-origin checks. The UI blocks duplicate submits; persistent idempotency keys and Resend idempotency protect retries across server instances. An active-send lease prevents simultaneous sends. After 23 hours, uncertain sends require manual history review because Resend's idempotency window expires after 24 hours.

The earlier contact origin rejection was the localhost/127.0.0.1 mismatch and unconfigured proxy/public origin. The shared origin helper accepts same-port/protocol loopback aliases, the request origin, configured NEXT_PUBLIC_SITE_URL, configured deployment origins, and explicit ALLOWED_ORIGINS. It does not trust arbitrary forwarded headers or allow wildcard CORS. Set the real public URL in production; error wording changes alone do not fix proxy configuration.

Contact accepts `{ name, email, message, subject? }` and retains the existing project form's company/phone/projectType/budget/description fields. Name/email/message are required; message has a 20-character minimum and 5,000-character maximum. Subjects are optional and reject header newlines. Unknown fields/objects are rejected. User content is escaped in HTML templates, with plain-text alternatives. Contact API returns success:true/200 only after provider acceptance, validation false/400, rate false/429, and provider/server failure false/500. Payload overflow returns 413. A failed notification remains in the Inbox even though the visitor sees an error and retains their form values.

Inbound signatures use the official SDK verifier with raw body, Svix ID/timestamp/signature, and the configured signing secret. Invalid/missing/stale signatures fail. Unique provider/event/RFC IDs and transactions prevent duplicates, including after soft deletion. Fetch/database failures return non-2xx so Resend can retry; no event is acknowledged before required storage. Unrelated recipients/events are ignored. HTML is retained privately but never returned/rendered in Inbox APIs; plain text is used, with HTML-to-text conversion for HTML-only emails. Scripts, remote images, embedded frames, and attachments are never rendered/executed.

Server diagnostics contain operation/timestamp/status and safe provider error codes, not email bodies, credentials, tokens, or raw provider errors. Password recovery retains generic account-independent responses, expiring hashed tokens, and session revocation.

## Verification and remaining manual tasks

Typecheck/build and automated local tests are recorded in `qa/RESEND-EMAIL-REPORT.md`. The integration fixture uses the real Resend SDK and signature verifier, intercepting only provider HTTP in the isolated test process; production has no test bypass. No live customer emails are sent by regression tests.

```powershell
npm.cmd run typecheck
npm.cmd run build
$env:E2E_MAIL_CAPTURE='1'
npm.cmd run test:server
# A second terminal:
$env:E2E_MAIL_CAPTURE='1'
$env:E2E_DATABASE_TESTS='1'
$env:E2E_BASE_URL='http://localhost:3100'
npx.cmd playwright test
```

Without live credentials, tests verify success/failure provider responses, validation, email headers and HTML escaping, form storage and duplicate prevention, origin behavior, rate limits, signature/replay rejection, webhook duplicates/retries/database failure, admin authorization, read/unread, search/filter/pagination, replies/history, archive/soft delete, password recovery, portfolio regression, and mobile overflow/browser errors.

Production acceptance still requires: valid private API key; verified sending domain; verified receiving MX; public HTTPS deployment URL; configured signed webhook; and your real send/receive/reply tests. At implementation time the local key did not have Resend's expected prefix, RESEND_WEBHOOK_SECRET was missing, and NEXT_PUBLIC_SITE_URL was unset. These external configuration requirements cannot be proved by mocked tests. No domain verification, inbound activation, or live delivery is claimed.
