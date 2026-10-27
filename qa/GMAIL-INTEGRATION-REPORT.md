# Gmail Admin integration report

Date: 2026-10-27. Implemented inside the existing Next.js Admin with MongoDB sessions. No deployment performed. The developer confirmed Google Cloud/OAuth setup has not been created yet.

## 1. Files created

- lib/gmail/client.ts
- lib/gmail/config.ts
- lib/gmail/contracts.ts
- lib/gmail/crypto.ts
- lib/gmail/mailbox.ts
- lib/gmail/mime.ts
- lib/gmail/models.ts
- lib/gmail/oauth.ts
- lib/gmail/send.ts
- components/admin/gmail/GmailCompose.tsx
- components/admin/gmail/GmailConnection.tsx
- components/admin/gmail/GmailInbox.tsx
- components/admin/gmail/GmailStatus.tsx
- app/api/admin/gmail/attachments/[messageId]/[attachmentId]/route.ts
- app/api/admin/gmail/callback/route.ts
- app/api/admin/gmail/connect/route.ts
- app/api/admin/gmail/disconnect/route.ts
- app/api/admin/gmail/messages/route.ts
- app/api/admin/gmail/messages/[id]/route.ts
- app/api/admin/gmail/reply/route.ts
- app/api/admin/gmail/send/route.ts
- app/api/admin/gmail/status/route.ts
- app/api/admin/gmail/threads/[threadId]/route.ts
- app/admin/(protected)/inbox/page.tsx
- app/admin/gmail.css
- scripts/test-gmail.ts
- scripts/fixtures/gmail-google.mjs
- docs/GMAIL-SETUP.md
- qa/GMAIL-INTEGRATION-REPORT.md

Responsive screenshots: qa/gmail/inbox-desktop-night.png, qa/gmail/inbox-tablet-day.png, qa/gmail/inbox-mobile-day.png. All contain simulated example.test mailbox data.

## 2. Existing files modified

- app/admin/(protected)/layout.tsx: shared Gmail status provider within existing authenticated layout.
- app/admin/(protected)/settings/page.tsx: Gmail connection/disconnect controls below existing Social Links manager.
- app/admin/layout.tsx: imports scoped Gmail stylesheet.
- components/admin/AdminNav.tsx and AdminIcon.tsx: Inbox navigation, icon and unread badge.
- proxy.ts: early Inbox page rejection; authoritative server-side authentication remains unchanged.
- next.config.ts: suppress development callback request logging to avoid OAuth authorization-code query strings in terminal logs.
- package.json and package-lock.json: official Google clients, sanitizer and isolated test command.
- .env.example: server-only Google/OAuth/encryption configuration examples.
- README.md: links to setup instructions, this report and the test command.

No changes to public layouts/content, portfolio/review data rules, SMTP/contact/password reset implementation, existing authentication cookies, Calendly, SEO, Fabric/water-header/graph animations or theme persistence.

## 3. Packages installed

Runtime: @googleapis/gmail 22.0.2 (Google's focused official Gmail client), google-auth-library 11.3.1, sanitize-html 2.18.1. Existing Nodemailer is reused for MIME generation; Admin sends via Gmail API, not SMTP.

Development: @types/sanitize-html 2.16.2 and nock 15.0.5. Tests use the installed Nock 15 Request-based callback API. No mailbox/client library is shipped to the browser.

## 4. Google Cloud manual setup

Follow [GMAIL-SETUP.md](../docs/GMAIL-SETUP.md) for exact Console screens: enable Gmail API, Google Auth Branding/Audience/Data Access, add the official mailbox as a test user where applicable, create a Web Application OAuth client, register localhost and actual production callbacks, then configure server variables and connect through Admin Inbox.

## 5. Environment variables

GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_TOKEN_ENCRYPTION_KEY (32 random bytes, base64), existing canonical APP_URL. GOOGLE_REDIRECT_URI optionally overrides the callback derived from APP_URL. GMAIL_ACCOUNT_EMAIL optionally restricts connection to the official mailbox and is recommended. No NEXT_PUBLIC secret variables. Existing SMTP variables remain independent.

## 6. OAuth scopes and token security

Only https://www.googleapis.com/auth/gmail.modify. It includes sending, so a separate gmail.send grant is unnecessary. No unrestricted mail.google.com scope.

OAuth uses offline access, explicit consent, incremental grants, S256 PKCE and ten-minute single-use state tied both to an HttpOnly Lax browser nonce and the live original MongoDB Admin session. This supports the Google cross-site callback without weakening the existing SameSite=Strict Admin cookie. Revoked/deleted/expired Admin sessions cannot complete connection.

Only AES-256-GCM encrypted refresh credentials, scope/account/status and connection metadata are stored in MongoDB. A separate encryption key is required. Tokens and Google raw errors are never returned to frontend/logs. The Google SDK refreshes access tokens in server memory automatically. The callback returns a same-origin intermediate document so Strict session cookies apply again on the next navigation.

## 7. Gmail account connected

**None yet.** OAuth credentials are absent, and Cloud setup is pending. Fixture mailbox official@example.test is test-only; it is not a real connected account. The authorized mailbox will be fetched from Google's profile and checked against GMAIL_ACCOUNT_EMAIL when configured.

## 8. Inbox features

Inbox, Sent, Starred; server-side Gmail search; 25-message pagination; metadata/MIME-structure-only list; sender/recipient, subject, timestamp, snippet, unread/star/attachment indicators. Full conversations load chronologically on demand. Individual messages support mark read/unread, star/unstar and archive. Opening unread thread messages marks them read only after successful label updates. No destructive Gmail deletion endpoint.

Desktop split view, mobile list/detail navigation with Back, manual refresh, unread sidebar badge, existing Day/Night panel styling and Fabric buttons. Google is the mailbox source of truth; no permanent mail-body/attachment database is created.

## 9. Sending and replying

Compose To/CC/BCC, required subject and plain-text message; server-side validation rejects header injection, arbitrary fields and From spoofing. Replies derive recipient and Message-ID/References from the fetched original Gmail message and send the trusted threadId with reply subject. Authenticated Gmail profile always determines From. Success is shown only after Gmail confirms an ID and the send receipt is saved.

A unique MongoDB request receipt prevents concurrent and repeated sends. Network/provider ambiguity leaves the request unconfirmed and blocks automatic retry; Admin must check Sent before starting another message. Receipt metadata expires after seven days; it contains no body or attachment bytes. Compose disables immediately during sending and remains blocked after an ambiguous result. Drafts are in memory only.

## 10. Attachments and email safety

Incoming attachments fetched on demand through authenticated backend, verified against their message/part, safe filename, forced attachment/octet-stream download, no-store/nosniff and 25 MB received-file limit. Long Gmail attachment IDs supported.

Outgoing: up to five PDF/DOCX/XLSX/PNG/JPG files, 10 MB each and 15 MB total. Bounded multipart parsing, MIME/content-signature checks, sanitized filename, no file/URL reads by MIME composer. ZIP archives intentionally excluded.

HTML email is strictly sanitized server-side; scripts, frames, forms, handlers, CSS, unsafe links and remote image tracking are removed. Text/plain supported; text dominates existing low-contrast decorative backgrounds. Remote/inline images are not rendered as active embeds.

## 11. Updates

Reliable 45-second polling while visible, plus manual Refresh and efficient INBOX label unread count. Shared status requests are coalesced within each Admin tab. Timers/listeners/fetches clean up on unmount; no full-mailbox initial scan. Pub/Sub push/watch renewal is intentionally not implemented without configured Google infrastructure.

## 12. Validation and remaining production steps

- Production Next.js build passed.
- TypeScript and ESLint passed.
- 80 isolated Gmail checks passed: OAuth callback/session/state/PKCE, rejected account/missing refresh token, AES authentication/tamper rejection, sanitized HTML, no credential exposure/logging, list/search/pagination, full chronological thread, safe labels, attachment ownership/type, MIME/BCC/connected From, true threaded reply headers, idempotent/concurrent sends, uncertain-send protection, expiring/revoked authorization, disconnected/reconnect screens and real browser compose/reply.
- Responsive checks: 1440, 1024, 768, 425, 390 and 320 pixels, no horizontal overflow; Day and Night; no browser/hydration errors in the Gmail flow.
- Existing Admin/auth/portfolio/reviews/SMTP regression: 347 integration assertions passed; 88 of 90 browser regressions passed. Two failures are outside the changed Gmail code: tests/booking.spec.ts expects the existing /api/meetings/availability endpoint to return 404 but it returns its configured-disabled 503; tests/header-water.spec.ts measured a 0.091 px difference while requiring less than 0.05 px. These routes, header code and tests were not changed or deleted for this task. The broader suite therefore does not currently pass in full.
- A real browser cross-site callback simulation confirmed that the Strict Admin cookie is withheld on the initial callback, the Lax OAuth nonce is validated against the still-live session, and the intermediate document returns to authenticated Inbox. Multiple messages in the same Gmail thread produce one conversation row.
- Scanned all 42 generated browser JS bundles: no Google client-secret, encryption-key, encrypted-refresh-token or token-endpoint markers.
- Existing QA artifacts were restored byte-for-byte after the broad regression run. Only new Gmail fixture screenshots are retained.

The isolated suite uses disposable local MongoDB and simulated Google transport, never a real mailbox or SMTP account. **Live Google consent, receiving real mail, actual external delivery, production callback registration/API enablement and Google verification remain unverified until the owner completes Cloud setup.** Restricted Gmail scope/assessment rules may apply; External Testing is not a guarantee of indefinitely valid refresh tokens. Exact next steps and a live-mail acceptance checklist are in the setup guide.

Commands: npm run lint; npm run typecheck; npm run build; npm run test:gmail. Build first; Gmail tests launch a local production server on port 3261 and shut down afterward.
