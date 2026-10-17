# Quite Logic email configuration

Outgoing contact notifications and password-recovery email use authenticated Resend SMTP through Nodemailer. See [SMTP-SETUP.md](./SMTP-SETUP.md) for private environment settings and sender-domain verification.

## Admin email removed

The admin dashboard no longer sends emails or replies, displays email history, or exposes SMTP configuration status. The composer, Inbox UI and outbound API routes were deleted. Old /admin/inbox links redirect to /admin/messages, a read-only searchable view of website contact submissions. Client email addresses remain contact information.

Existing messages and email-history records were retained; no destructive database migration is required. The dashboard no longer loads outbound history. An obsolete email-history table may remain to preserve records from prior versions.

## Features retained

- Public contact form: validates and persists the inquiry before notifying contact@quitelogic.com; uses the visitor address as Reply-To, never From.
- Password recovery: sends a time-limited, one-use reset link using server-only SMTP credentials.
- The separately configured Resend receiving webhook: verifies raw-body signatures, retrieves inbound message bodies, and stores them privately. Inbound emails do not appear in the contact-only admin view; use Resend's provider interface for email operations. The webhook does not send automatic replies.

Verify quitelogic.com in Resend before sending as contact@quitelogic.com. Verification of quitelogic.net does not authorize the .com address. Do not expose credentials through NEXT_PUBLIC_ variables, source files, logs or chat.

## Verification

Use the disposable database and provider fixture for tests. Do not run automated email tests against real clients or a production database. Live contact/password-reset delivery still requires valid hosting secrets and a verified sender domain.
