# Supabase migration — 2026-10-17

The existing Quite Logic PostgreSQL data was copied from Neon to the configured Supabase Session pooler. `.env.local` now points DATABASE_URL at Supabase. The Neon database was left unchanged as a pre-migration fallback; it is not synchronized with future Supabase writes.

## Data copied and verified

| Table | Rows |
| --- | ---: |
| admins | 1 |
| portfolio_projects | 3 |
| admin_sessions | 2 |
| request_limits | 3 |
| app_migrations | 1 |
| clients, reviews, messages, email_history, password_resets | 0 each |

Every table's canonical row digest matched before committing the target transaction. Admin password hashes, timestamps, project order/publication state, and existing sessions were preserved. No admin password was changed. UUIDs and bytea fields are copied without generating replacements. The source snapshot was protected by shared table locks during copying. The target was confirmed empty before schema initialization; existing target tables are never overwritten by the migration script.

## Connection security

The initial connection failed with SELF_SIGNED_CERT_IN_CHAIN. Supabase's public root CA was downloaded from the exact URL used in its official Studio configuration and checked with SHA-256 fingerprint `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. It expires on 2031-04-26.

`lib/postgres-config.mjs` centralizes connection configuration for the runtime and migration/setup scripts. Supabase hosts receive this additional trusted public CA; other remote providers retain the normal root store. Remote certificate and hostname verification remain enabled. No rejectUnauthorized:false workaround or global TLS-disable setting was introduced. The public certificate is bundled in `lib/supabase-ca.mjs`, so Hostinger does not need an extra secret or certificate-file path.

Official sources: [Supabase Studio certificate URL](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json), [SSL configuration](https://supabase.com/docs/guides/platform/ssl-enforcement), [connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres).

All ten application tables have RLS enabled. Public/anon/authenticated table privileges are revoked. Public website data continues through the existing Next.js server APIs/SSR and its private owner connection; no direct Supabase browser access or Supabase Auth replacement was introduced.

## Verification

- Production build and TypeScript checks passed.
- TLS configuration and contact validation/template tests: 3 passed.
- Production application tested against the actual migrated Supabase database: homepage, portfolio, reviews, and admin login page returned 200.
- Authenticated dashboard, portfolio, Inbox, and review APIs returned 200. Portfolio returned the expected three projects; Inbox/reviews were correctly empty.
- Contact validation returned 400 for an empty submission, without sending email.
- A five-minute test session verified existing admin authorization and was removed immediately afterward. The private bootstrap credentials did not match the existing account, so a real password login was not claimed tested. The existing password hash was copied exactly.
- No Resend sending or domain/DNS changes were performed; email setup remains deferred as requested.

## Hostinger deployment

Copy the new DATABASE_URL value from private `.env.local` into Hostinger's server-only DATABASE_URL setting, then rebuild/redeploy. Never upload private env files or expose the value through NEXT_PUBLIC variables. SUPABASE_DATABASE_URL is a migration target setting and is not required by the runtime. Keep NEXT_PUBLIC_SITE_URL set to the actual HTTPS public domain for deployment.

Do not rerun `admin:setup` merely to deploy; it resets the configured admin password. `npm run db:migrate` remains available for normal schema updates. The one-time `node scripts/migrate-to-supabase.mjs --apply` refuses an existing target or identical source/target and should not be rerun after cutover.
