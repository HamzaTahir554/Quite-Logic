# Quite Logic audit — 17 October 2026

Scope: current local source/configuration, read-only database connectivity and aggregate counts, and the public Hostinger preview site. No password, database records, email delivery, hosting settings, or DNS was changed. Credentials were not printed. This is a focused audit, not an exhaustive penetration or performance test.

## Confirmed findings

1. **High: hosted database-backed features fail.** Same-origin login with an invalid diagnostic identity returns HTTP 503 after validation; `/api/reviews` also returns 503. Home, Portfolio and Reviews render unavailable states. Empty login and contact payloads correctly return 400. The earlier origin rejection is resolved. An unauthorized portfolio-management request returns 401, as expected. The exact hosted database/provider/error cannot be inferred from these public responses; private Hostinger configuration/logs are needed.

2. **High: local runtime currently uses Neon, not Supabase.** `.env.local` contains `SUPABASE_DATABASE_URL` but has no `DATABASE_URL`. Next's environment loader therefore takes `DATABASE_URL` from `.env`, pointing to Neon. `SUPABASE_DATABASE_URL` is a migration target only. Read-only checks: Neon has 1 admin, 3 projects, 0 reviews and 0 messages; Supabase has 1 admin, 3 projects, 0 reviews and 1 message. Both connect with the current local TLS helper. These are separate databases and are not synchronized. This supersedes the previous migration report's runtime configuration observation.

3. **High: outgoing sender domain is unverified.** The Resend API reports `quitelogic.com: not_started` and `quitelogic.net: verified`. The configured SMTP sender is `contact@quitelogic.com`. Verification of a different domain does not authorize this sender. No email was sent during this audit. Domain verification and a subsequent delivery test remain necessary for contact notifications, admin email and password recovery.

4. **Medium: recovery credentials remain in local files.** Both `.env` and `.env.local` still contain bootstrap passwords. After an intentional admin reset, remove `ADMIN_SETUP_PASSWORD` from private environment files/settings. Never commit or publish them. Editing that variable alone does not change the account: the setup script must run against the intended database.

5. **Medium: unexpected admin failures lack useful server diagnostics.** `lib/admin-security.ts:apiError` converts unknown exceptions to 503 without logging an error category/code. Keeping browser errors generic is appropriate; sanitized server-side diagnostics would distinguish missing configuration, authentication, TLS, network and missing-schema failures. The public responses alone do not prove which one is occurring on Hostinger.

6. **Medium: bootstrap password resets leave reset tokens intact.** `scripts/database.mjs --admin` updates the hash and revokes sessions, but does not delete existing `password_resets` for that account. A previously issued, unexpired reset link can still reset the password afterward. The regular change-password/reset APIs already invalidate these tokens. The bootstrap script also enforces only length, whereas the normal password form has additional strength rules.

7. **Deployment/SEO observation:** the hosted `/robots.txt` blocks Googlebot on the preview hostname and differs from local `app/robots.ts`. This may be intentional preview-host behavior; verify indexing rules on the final production domain. Hosted canonical URLs currently use the preview hostname. Local `NEXT_PUBLIC_SITE_URL` is unset, causing a localhost metadata/reset-link fallback in a fresh local build; configure the genuine public origin before production builds.

## Checks that passed

- `npm.cmd run typecheck` and `npm.cmd run build`.
- Desktop: Home, Services, About, Work, Portfolio, Contact, Reviews and Admin Login returned 200.
- Mobile viewport 390 × 844: Home, Services, Portfolio and Contact returned 200.
- No uncaught browser JavaScript errors, detected horizontal overflow or completed-but-broken loaded images in those checks. These checks do not establish 60 FPS, absence of all layout shifts, or every lazy-loaded asset/interaction.
- Admin access protection and input validation behaved as expected in the tested requests.
- Passwords use salted scrypt hashes; session cookies are HttpOnly, production Secure and SameSite Strict. SQL input uses parameters in the reviewed authentication paths. Public reviews select Approved status server-side.

## Change an admin password using the existing script

Choose the intended database first. Privately edit `.env.local`:

```dotenv
DATABASE_URL=<complete connection string for the intended database>
ADMIN_SETUP_EMAIL=<existing admin account email>
ADMIN_SETUP_PASSWORD=<new unique password, 16–200 characters>
```

Use the exact existing account email; another email creates another admin. Prefer a long unique password containing letters, numbers and symbols. Do not put the password in source code, a shell argument, chat or Git.

From the project directory run:

```powershell
npm.cmd run admin:setup
```

The script hashes and stores the password and revokes that account's sessions. Changing the environment variable alone has no effect. Remove `ADMIN_SETUP_PASSWORD` afterward. The script loads `.env.local`; unlike Next's environment loader, it does not load `.env` itself.

If local and Hostinger use the same database, the stored password change applies to both without redeploying. It will not repair a 503 database connection failure. If they use different databases, it affects only the selected database.

Once login works, `/admin/change-password` is the preferred routine method: it verifies the current password and revokes sessions and reset links.

## Recommended order

1. Decide on one runtime database, preferably the intended Supabase project; reconcile any data before switching. Do not rerun the empty-target migration against an occupied database.
2. Configure `DATABASE_URL` consistently in local runtime and Hostinger. Keep the latest verified-TLS helper deployed. Supabase's session pooler supports persistent backends on IPv4-only networks: https://supabase.com/docs/guides/database/connecting-to-postgres
3. Diagnose/retest hosted login and reviews with private server diagnostics. Do not disable TLS verification or authentication to hide the error.
4. Verify the actual sender domain in Resend, then test contact and password-reset delivery.
5. Reset the password only if required; remove bootstrap secrets and review final-domain SEO settings.
