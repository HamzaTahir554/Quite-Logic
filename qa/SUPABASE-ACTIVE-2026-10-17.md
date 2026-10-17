# Supabase is the active local database

This supersedes the configuration findings in `WEBSITE-AUDIT-2026-10-17.md`.

- Promoted the existing, verified Supabase connection from migration-only `SUPABASE_DATABASE_URL` to runtime `DATABASE_URL` in private `.env.local`.
- Removed the old Neon `DATABASE_URL` from `.env`; it can no longer act as a fallback.
- Removed the migration-target setting from active/example configuration. The one-time migration script remains as historical tooling; it requires explicit source/target settings and was not run.
- Updated the admin setup guide to use Supabase with Hostinger.
- No database records, passwords, projects or messages were changed. The hosted Neon database itself was not deleted.

Hostinger has separate environment settings. Set its `DATABASE_URL` to the same private Supabase connection used locally, remove any old Neon connection there, and redeploy/restart. Never publish the connection string or `.env.local`.

Keep historical migration/audit reports as evidence; their earlier Neon references are not active connections. A generic third-party-host TLS test is also unrelated to runtime configuration.
