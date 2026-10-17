# Quite Logic

Existing Next.js 16.4.1 App Router website, React 19, strict TypeScript, MUI, Framer Motion, GSAP and Three.js. MongoDB now powers admin accounts, review moderation, and the public portfolio. Existing public pages, glass styling, animations, Calendly and the browser email-draft contact flow are retained.

## Local setup

Use Node.js 24. Copy `.env.example` to `.env.local` and fill in your own values. Keep `.env.local` private.

For local development, set both `APP_URL` and `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000`. Use the final HTTPS origin in production.

```sh
npm install
npm run db:check
npm run admin:create
npm run db:seed
npm run dev
```

`admin:create` prompts for an email and hidden password. Passwords require 12–128 characters, uppercase and lowercase letters, a number, and a symbol. No default admin or public signup exists. Existing accounts are never overwritten by this command.

`db:check` verifies MongoDB connectivity without creating an account or printing the connection string. If `MONGODB_URI` is missing, add your actual Atlas application connection string to `.env.local`, including the database name and database user credentials. Replace Atlas placeholders and URL-encode special characters in credentials. The admin creation command checks database readiness before asking for account details and reports configuration, connectivity, permission, and existing-account failures separately.

`db:seed` imports the three existing portfolio concepts from `data/portfolio.json` into MongoDB without overwriting existing edits. This is an explicit, one-time migration; public portfolio cards subsequently use MongoDB. `data/reviews.json` is empty, so no testimonials are invented or migrated. Existing editorial case-study content remains in `data/content.ts`.

MongoDB must be available to manage content. Missing/unavailable database configuration produces a friendly public empty state and generic API errors; it does not substitute fake database data. Build validation does not need production credentials.

## Admin

Visit `/admin/login` or the subtle footer link. Navigation includes Dashboard, Reviews, Portfolio, Account and Logout.

- Reviews: clients submit at `/reviews#share-review`; new reviews are pending. Search/filter, approve, reject or delete at `/admin/reviews`. Public queries include approved reviews only, with email omitted.
- Portfolio: add/edit title, slug, logo, description, category, technologies, URL, featured flag and order at `/admin/portfolio`. Drafts remain private. Publish/unpublish, move earlier/later, edit display order or delete. Lower order appears first. Reordering uses a transaction and works across list pages.
- New managed projects have `/portfolio/[slug]` detail pages automatically. The original illustrative case-study routes and their animations remain available as editorial content independently of portfolio listing publication. Original slugs retain those curated detail pages.
- Desktop portfolio hover reveals descriptions in 250–300 ms. Touch reveals details on the first tap; the separate CTA opens the project. Tab, Enter/Space and Escape are supported; reduced motion is honored.
- Account: verify the current password before changing it. A successful change revokes every session and requires sign-in again.
- Forgot password: enter email at `/admin/forgot-password`. The response does not disclose account existence. SMTP sends a link valid for 30 minutes. Only its SHA-256 hash is stored. Atomic consumption prevents reuse, including concurrent requests. Resetting also revokes all sessions.

## Storage and security

Small logos are stored persistently in MongoDB as WebP, behind a storage utility in `lib/project-storage.ts`. Upload accepts PNG/JPEG/WebP, up to 2 MB and 16 megapixels. Sharp decodes and re-encodes the image, checks MIME against its actual format, removes metadata, rejects SVG and animated images, and bounds output dimensions. No writable server disk or third-party storage account is required. The adapter can later be replaced with S3 or Cloudinary.

Images are publicly accessible only while referenced by a published project. Authenticated admins can preview drafts. Abandoned/replaced uploads remain in MongoDB for safe reuse; periodically remove unreferenced images after a retention period if storage grows. Back up MongoDB, including the image collection.

Server checks protect every admin page and API. Passwords use salted scrypt; opaque 256-bit sessions are stored as SHA-256 hashes and expire in eight hours. Cookies are HttpOnly, SameSite=Strict and Secure in production. Sessions are checked against an account version for immediate revocation. JSON bodies, upload streams, IDs, status values, URLs and slugs are validated. Browser mutations require the configured same origin. MongoDB-backed rate limits cover login, recovery, review submission and uploads; sessions and rate-limit records have TTL indexes. Expiration checks do not depend on TTL cleanup timing. Lists are paginated and public projections omit private fields. Public database reads are deduplicated per render and intentionally read current moderation/publication state.

## Production

This application now requires a **Node.js server**. Static `out/` deployment cannot run its admin panel or APIs. The old static preview/finalization scripts and Apache `.htaccess` are legacy artifacts and are not used by `build` or `start`.

1. Create a MongoDB Atlas database/user with access limited to this application database. Allow the application host's network address. A replica set is required for transactional reordering; Atlas provides one.
2. Set `MONGODB_URI` with the database name, `APP_URL` to the exact public HTTPS origin, and `NEXT_PUBLIC_SITE_URL` to the same origin. Rebuild when changing the public URL.
3. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` using a sender authorized by your mail provider. Port 465 uses TLS; 587 uses STARTTLS. Leave `SMTP_REQUIRE_TLS=true` for production. Verify real reset email delivery before relying on recovery.
4. Run `npm run admin:create` and `npm run db:seed` against that database from a trusted machine. These initialize model indexes as well as content/accounts. Never use production credentials for tests.
5. Run `npm run lint`, `npm run typecheck`, `npm run build`, then `npm start`. Set the host's `PORT` as needed. Deploy source/build and production dependencies to a Node-capable host, not an old static web root. Use HTTPS and a reverse proxy with body/time limits.
6. Set `TRUST_PROXY=true` only when a trusted proxy overwrites `X-Forwarded-For`. Without it, IP-based limits safely share a bucket; per-email/admin limits remain active. Configure edge rate limiting for public reads and large/slow requests.
7. Verify login/logout, a real password-reset email, logo uploads and publication on the final HTTPS domain. Monitor delivery failures and MongoDB availability, and enable backups.

See [implementation report](qa/MONGODB-ADMIN-REPORT.md) for files, routes and validation results.

## Validation

```sh
npm run lint
npm run typecheck
npm run build
npm run test:admin
```

`test:admin` launches a disposable local MongoDB replica set, local SMTP sink and the production Next.js server on ports 3217/3218. It checks auth, CSRF, moderation/privacy, upload validation, project CRUD/reordering, reset email delivery and one-use/expired tokens, password changes, server restart/session persistence, responsive admin screens, then the existing Playwright browser suite. It never uses the production database or SMTP credentials. The first run downloads a MongoDB test binary; Chromium must be installed (`npx playwright install chromium`). Set `ADMIN_TEST_PORT` to use another port pair. All child services stop afterward. `npm run test:e2e` can also target an already configured local test server using `E2E_BASE_URL`.
