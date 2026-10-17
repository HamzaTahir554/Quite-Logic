# Frontend-only conversion

## Result

Quite Logic is now a static Next.js export. Deploy only the contents of `out/` to a static host such as Hostinger's website root. No server process, database, admin account or email credentials are required in production.

Removed from the active application:

- Admin pages, authentication, password recovery/change APIs, dashboard and footer login link.
- Database connections, Supabase/Neon integration, migrations/setup tooling, review moderation and portfolio management/upload APIs.
- Resend/SMTP integrations, email webhooks, client/message storage and all application API routes.
- Backend dependencies, active private backend environment settings, backend-only CSS and obsolete backend tests.

## Preserved frontend

- Existing public pages, glass/crystal branding, services, cursor/text/banner motion, mobile behavior and client-side Calendly booking.
- Three published portfolio projects copied to `data/portfolio.json`, with local images and existing case-study pages. No private client/contact/admin records were exported.
- `data/reviews.json` contains the approved public reviews snapshot: zero reviews. No testimonials were invented. The reviews page remains with a direct email link; review submission/approval is gone.
- Contact form retains client-side validation and produces an encoded email draft with an explicit Open Email App action and copy fallback. It sends no request, stores nothing persistently and makes no false delivery claim.
- Static metadata, sitemap, robots, manifest and local social preview PNG. The old Lens URL remains a static client-side compatibility page for Atlas.
- Manrope is self-hosted with its open-font license, eliminating a Google Fonts build-time/network dependency.

## Build and hosting

`npm run build` generates the static site and materializes compatible segment-prefetch filenames so navigation works on normal static hosts. `npm start` is a local file-preview utility only. Hostinger can serve `out/` without Node.js. Include `.htaccess`, which maps clean URLs to their HTML files and handles the branded 404; folder names shared with exported page assets do not prevent page lookup.

Set `NEXT_PUBLIC_SITE_URL` to the real final website origin before a production build. No other environment variables are required. Upload the contents of `out/`, not the repository, `.env` files or archive.

## Verification

- Production static export: passed; no dynamic server-rendered routes in the build output.
- TypeScript: passed.
- Full frontend browser/API-absence suite: 29 passed on the final run. Covers responsive pages, hover/touch/keyboard portfolio behavior, draft validation and privacy, SEO files, no admin/API routes or backend dependencies, no backend network calls, no detected broken loaded images, existing scenes and reduced-motion behavior.
- An initial run found missing flattened static navigation assets and an ambiguous test locator. Added a build finalizer and scoped the locator, then reran the complete suite successfully.
- Final deployment `.htaccess` configuration was reviewed but not executed on a live Apache/LiteSpeed host during these checks.

## Archive and remote state

Automatic approval review rejected bulk permanent deletion because it would irreversibly remove migrations, security code, tests and reports. The removed source is instead in the reversible local `.backend-archive/`, excluded from TypeScript, Git and the static deployment. It is not loaded by the website. Do not deploy this archive.

Remote databases and provider accounts were not modified or deleted. The published website on Hostinger is unchanged until the static export is deployed there. Old hosting secrets can be removed because the new static site does not use them.
