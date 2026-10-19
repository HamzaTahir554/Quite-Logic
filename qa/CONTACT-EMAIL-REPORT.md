# Direct contact email

The existing `/contact` form now posts to `POST /api/contact` instead of preparing a mailto draft. Visitors stay on the website. Existing fields, glass styling, entrance motion, Calendly and optional direct email links remain.

The Node route validates the shared strict schema, requires the configured same origin, bounds JSON bodies to 64 KiB, rejects the honeypot and applies the existing atomic MongoDB rate limiter. Limits are 20 attempts per client address per 15-minute fixed window and five per normalized sender email per hour. With `TRUST_PROXY` disabled, addresses share the first bucket, as with other existing endpoints. Inquiry content is not stored in MongoDB; rate records contain hashed keys, counts and expiry times.

`lib/email.ts` shares the SMTP transport with password resets. Inquiries use the authorized `SMTP_FROM`, a fixed recipient (`CONTACT_TO` or `company.quitelogic@gmail.com`) and the visitor's email as Reply-To. All visitor content is plain text. The strict request schema rejects recipient/header overrides. No automatic reply is sent. The endpoint waits for SMTP acceptance and returns a generic 503 for configuration or delivery failures, without logging message content or credentials.

The form validates before submitting, announces progress and results, disables repeat submission while sending and after success, preserves input on failures, and allows a new submission after editing a field. Unmounting aborts the client fetch. A lost connection can leave acceptance uncertain; the error says the submission could not be confirmed. SMTP acceptance itself does not guarantee inbox placement.

## Deployment

Deploy the updated source as a Node.js application. Keep the existing `MONGODB_URI`, `APP_URL` and `NEXT_PUBLIC_SITE_URL`; both URLs must match the final HTTPS origin. Configure these server variables for the existing Gmail sender:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=company.quitelogic@gmail.com
SMTP_PASSWORD=<Google App Password>
SMTP_FROM=company.quitelogic@gmail.com
SMTP_REQUIRE_TLS=true
```

`CONTACT_TO` is optional and accepts one email address. Without it, inquiries go to `company.quitelogic@gmail.com`. Restart/redeploy after environment changes. Submit one real inquiry after deployment, check inbox/spam and confirm that Reply targets the visitor. Real Gmail delivery has not been tested from this workspace.

## Validation

Passed `npm run lint`, `npm run typecheck`, `npm run build` and `npm run test:admin`: 230 integration assertions and 39 Playwright tests.

The disposable MongoDB/local SMTP integration runner checks real SMTP delivery, trusted From/To and Reply-To, all inquiry fields, plain text output, schema/header/recipient rejection, honeypot, origin, method, content type, malformed/oversized JSON, recipient/DATA refusal, recovery, missing SMTP/invalid recipient configuration and both rate limits. Production SMTP credentials are overridden in the test server.

Browser coverage includes a real request to the local SMTP endpoint, progress without premature confirmation, repeated submit prevention, retained values, editing after success, mobile network/rate-limit errors and retry, server field errors, and existing site/admin regressions. Mobile retry/error tests use mocked HTTP responses; the desktop submission and integration tests exercise real local SMTP. Captures are in `qa/contact-email/`.
