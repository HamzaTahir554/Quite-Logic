# Quiet Logic — Resend SMTP setup

Outgoing contact notifications and password resets now use Nodemailer over authenticated Resend SMTP. The official sender/recipient remains **contact@quitelogic.com**. Existing Supabase data, admin authentication, and public pages are preserved.

## Configuration

These non-secret settings are already in private `.env.local`:

```dotenv
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
EMAIL_FROM="Quiet Logic <contact@quitelogic.com>"
EMAIL_TO=contact@quitelogic.com
EMAIL_REPLY_FROM="Quiet Logic <contact@quitelogic.com>"
```

The existing private **RESEND_API_KEY** is reused as the SMTP password. No duplicate credential is needed. An explicit SMTP_PASSWORD can override it, but must stay server-only. The API-key fallback is allowed only for the exact smtp.resend.com host, preventing accidental disclosure to another provider. Port 465 uses immediate TLS; port 587 requires STARTTLS. Certificates are verified, TLS 1.2 or later is required, and SMTP protocol logging is disabled.

Hostinger deployment needs the same SMTP settings, private RESEND_API_KEY, existing DATABASE_URL, and the actual HTTPS NEXT_PUBLIC_SITE_URL. Use environment settings, not uploaded private env files. Rebuild/restart after changing settings.

## Current verification

- Live SMTP connection and authentication: **passed** on smtp.resend.com:465.
- Production build and TypeScript checks: **passed**.
- Historical test results preceded removal of admin email tools; see the latest admin cleanup report for current checks.
- Missing-SMTP-credentials variant: **1 passed**; inquiry is retained, sending is disabled appropriately, and errors remain friendly.
- Configured credential values scanned against the generated frontend files: **0 matches**.
- Resend account already had quitelogic.net verified. A new quitelogic.com verification entry was created for the requested sender; its DNS verification is still pending.
- **No live email was sent.** Authentication alone does not prove permission to send from an unverified domain or final recipient delivery.

## Activate contact@quitelogic.com

1. Open Resend → Domains → **quitelogic.com**.
2. Open the authoritative DNS provider for quitelogic.com. If Hostinger manages this domain's DNS, use that domain's DNS zone in hPanel.
3. Add the exact records in [the generated DNS checklist](qa/RESEND-SMTP-DNS.md). The public raw values are also in `qa/resend-quitelogic-com-dns.json`. Use current dashboard values if they have changed. Do not replace unrelated website or mailbox records.
4. In Resend, select Verify DNS Records and wait until the sending domain is verified.
5. Tell the assistant the DNS is ready. It can recheck verification and send one clearly labelled test to contact@quitelogic.com.

The existing quitelogic.net verification was preserved. No DNS records, domain registrations, or subscription changes were made.

## Receiving and contact submissions

SMTP provides **outgoing delivery**. It does not fetch inbound messages. Website contact submissions continue to be saved directly into Contact Messages before sending their SMTP notification.

Direct email receiving still uses the existing verified Resend email.received webhook and Receiving API. Keep RESEND_API_KEY and RESEND_WEBHOOK_SECRET configured for that flow. Receiving requires its own verified MX configuration; sending DNS alone does not activate it. Review [RESEND-SETUP.md](RESEND-SETUP.md) for receiving instructions. Existing mailbox MX services must be considered before changing receiving routes.

## Delivery behavior and security

- The visitor's email is Reply-To, never From. The admin dashboard has no email composer or reply tools.
- Existing validation, rate limits, request-origin checks, spam honeypot, HTML escaping, authentication, and private database storage remain active.
- Database records and send locks prevent simultaneous/duplicate submissions. Message-ID is deterministic for the stored operation; SMTP itself has no provider idempotency guarantee.
- Explicit rejection or failure before SMTP submission is retryable. A disconnect after DATA, expired in-progress send, or uncertain database update is recorded as **Delivery uncertain**. Repeating that operation is blocked until the admin checks the provider logs, reducing accidental duplicates. A stable Message-ID alone cannot guarantee recipient-side deduplication.
- SMTP credentials, full provider errors, message bodies, and raw SMTP conversations are never logged or returned to the browser. SMTP cannot access arbitrary local files or external content through Nodemailer.

Official references: [Resend SMTP](https://resend.com/docs/send-with-smtp), [Nodemailer SMTP/TLS](https://nodemailer.com/smtp).
