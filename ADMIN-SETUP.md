# Reviews and admin setup

The website uses hosted PostgreSQL for reviews, clients, messages, admin accounts, sessions, and rate limits. It supports Vercel / Next.js Node.js functions; it does not depend on local writable storage. Public reviews are server rendered to avoid a loading-to-card layout shift. Only Approved reviews and their images are public.

## Server settings

Configure these privately in `.env.local` for development and in your hosting environment for deployment:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-domain.example
DATABASE_URL=your-hosted-postgresql-connection-string
GMAIL_APP_PASSWORD=your-google-app-password
```

Use a **pooled PostgreSQL URL** from Neon, Supabase, or your database provider, preferably in the same region as the website. Remote connections verify TLS certificates. The app opens at most three connections per server instance; provider connection pooling is important for serverless scaling. Do not expose the database to a browser or enable public table access. Enable provider backups and restrict access to production credentials.

The Gmail app password must belong to **company.quitelogic@gmail.com**. Sending uses authenticated Gmail SMTP over TLS, with this exact From address. See [Google app passwords](https://support.google.com/mail/answer/185833?hl=en) and [Nodemailer Gmail guidance](https://nodemailer.com/usage/using-gmail). Gmail requires eligible account settings and 2-step verification. No email credentials are embedded in client bundles. Gmail account sending limits still apply.

Contact messages are saved before notification. If Gmail fails or is not configured, the dashboard retains the message and records `Notification failed`; the visitor is told that the inquiry was **received**. Existing Resend notification settings remain an optional fallback when Gmail is not configured. Admin email sending always uses Gmail. Remove obsolete or invalid Resend credentials if you do not use that fallback.

## Initialize the database and admin

1. Run `npm run db:migrate` against the intended database. The initial SQL migration is transactional and safe to rerun.
2. Temporarily set `ADMIN_SETUP_EMAIL` and `ADMIN_SETUP_PASSWORD` in your private local environment. Use a unique password of at least 16 characters (maximum 200). There is no default production account and no public sign-up endpoint.
3. Run `npm run admin:setup`. This creates the admin or resets that account's password and revokes its existing sessions.
4. Remove `ADMIN_SETUP_PASSWORD` after setup. Do not place it in public hosting variables, source control, chat, or a command-line argument.
5. Run `npm run build`, deploy the existing Next.js project, and visit `/admin/login` over HTTPS.

The migration/setup scripts load `.env.local` if present. Explicit process environment values take precedence. They do not print secrets. Passwords are salted and hashed with scrypt. Sessions expire after eight hours and use opaque tokens; only token hashes are stored. Production cookies are Secure, HttpOnly, and SameSite=Strict. Logout and password reset revoke sessions on the server. All admin data and mutations require authentication, and mutations require a matching Origin. Admin pages are excluded from indexing and sitemaps.

## Workflows

- `/reviews`: client submission with private email, optional profile/logo, consent, rating, and service. Images are limited to 2 MB / 16 megapixels and re-encoded to 256px WebP with metadata removed. New reviews always start Pending, even if a caller tries to supply another status.
- `/admin/reviews`: search/filter, approve, reject, edit, and permanently delete reviews. Only approval makes a review public. Rejection/deletion also removes public access to its image. Editing preserves its current moderation status.
- `/admin/clients`: normalized email groups contact messages and reviews under one client. Details show the ten most recent submissions of each kind; the Reviews and Messages sections provide paginated access to all submissions.
- `/admin/messages`: read inquiries, choose a client, compose an email, and inspect sending history. Sending is explicit. A transport failure is recorded as Failed, while a process interruption may leave Sending; verify delivery before retrying to avoid duplicate messages. Sent means Gmail accepted the message, not guaranteed inbox delivery.
- Public and admin endpoints use persistent shared rate limits. Forms also include validation, request size limits, and honeypots. Contact/review forms remain functional without motion.

Client information is private to admins; review consent covers the submitted public name, company, role, review, and image. Keep database access restricted and manage your business's retention policy. Review deletion removes that review and image; client and message records remain for relationship management.

## Verification without live credentials

```powershell
npm run build
npm run test:server
# In another terminal:
$env:E2E_BASE_URL='http://localhost:3100'
$env:E2E_DATABASE_TESTS='1'
npx playwright test
```

The test server binds to loopback only, runs disposable in-memory PostgreSQL through PGlite's wire adapter, and overrides all outbound email credentials to empty. It exercises the same production `pg` adapter and SQL. Its fixture-only account is `admin@example.test` / `Local-Test-Only-123456!`; it never creates an account in the hosted database. Stop with Ctrl+C to discard the data. PGlite and its socket adapter are dev dependencies, not production storage.

Integration tests cover moderation, private images, admin access, CSRF, cookie flags, session revocation, validation, persisted contact messages, email configuration errors, login rate limits, mobile forms, and cursor edge tracking. Live hosted-database connectivity and Gmail delivery require your configured server credentials and a separate authorized delivery test.
