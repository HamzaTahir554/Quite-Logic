# Quite Logic

Existing Next.js 16.4.1 App Router website, React 19, strict TypeScript, MUI, Framer Motion, GSAP and Three.js. MongoDB powers admin accounts, review moderation, and the public portfolio. The contact form sends inquiries directly through server-side SMTP. Existing public pages, glass styling, animations and Calendly are retained.

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

Visit `/admin/login` or the subtle footer link. Navigation includes Dashboard, Reviews, Portfolio, Social Links, Account and Logout.

The workspace uses a desktop sidebar and a mobile drawer. Projects include private card/detail previews, inline validation, Save Draft/Publish actions, sorting, image fallbacks and unsaved-change warnings. Review summaries open a full detail dialog. Confirmations protect removals and rejection; toasts and inline errors provide feedback. See [the UX report](qa/ADMIN-UX-REPORT.md) for behavior, screenshots and validation.

- Reviews: clients submit at `/reviews#share-review`; new reviews are pending. Search/filter, approve, reject or delete at `/admin/reviews`. Public queries include approved reviews only, with email omitted.
- Portfolio: add/edit title, slug, logo, description, category, technologies, URL, featured flag and order at `/admin/portfolio`. Drafts remain private. Publish/unpublish, move earlier/later, edit display order or delete. Lower order appears first. Reordering uses a transaction and works across list pages.
- New managed projects have `/portfolio/[slug]` detail pages automatically. The original illustrative case-study routes and their animations remain available as editorial content independently of portfolio listing publication. Original slugs retain those curated detail pages.
- Desktop portfolio hover reveals concise descriptions in 250–300 ms; clicking the logo, title or card opens its detail page. Touch reveals details on the first tap; a second tap or View Project opens the page. Keyboard focus/Space reveal details; the description region and CTA are separate Tab targets, Enter opens the project and Escape closes the reveal. Reduced motion is honored.
- Portfolio uses compact cards, centered sparse grids and the existing Day/Night surfaces. The first Featured project in the loaded results receives a lead layout; remaining projects retain Admin display order. Existing short descriptions take priority in card previews. Managed detail pages recognize Overview, Challenge, Solution, Approach, Outcome and Results headings in the existing description; long prose is divided into readable paragraphs without inventing case-study claims or adding database fields. See [portfolio refinement notes](qa/PORTFOLIO-REFINEMENT-REPORT.md).
- Account: verify the current password before changing it. A successful change revokes every session and requires sign-in again.
- Social Links: manage LinkedIn, Instagram, GitHub, Facebook, X / Twitter and YouTube at `/admin/settings`. Each platform has one profile URL, an enabled switch and display order. New links are disabled by default. Save, edit, reorder with arrows or confirm deletion; only enabled links appear in the public footer. No social URLs are hardcoded or automatically seeded. The footer fetches fresh data on navigation and when returning to the tab, without rebuilding public pages. Existing MongoDB configuration and replica-set support are reused; no new environment variables or packages are needed.
- Forgot password: enter email at `/admin/forgot-password`. The response does not disclose account existence. SMTP sends a link valid for 30 minutes. Only its SHA-256 hash is stored. Atomic consumption prevents reuse, including concurrent requests. Resetting also revokes all sessions.

## Contact messages

Visitors submit at `/contact` without opening an email application. `POST /api/contact` validates the same schema as the form, checks the configured origin, limits request size, rejects the honeypot and unexpected fields, and applies MongoDB-backed limits (20 attempts per address per 15 minutes, five per sender email per hour). MongoDB must be available for rate limiting; inquiry content is not stored there.

The existing six `SMTP_*` variables also send contact messages. `SMTP_FROM` must be an authorized sender. The recipient defaults to `company.quitelogic@gmail.com`; set the optional server-only `CONTACT_TO` to a single email address to override it. The visitor's address is Reply-To, so Reply in your inbox reaches them. Visitors cannot select recipients or send automatic confirmation emails.

The form shows progress, prevents repeat submissions while sending, and confirms only after SMTP acceptance. Errors preserve all fields for retry. After success, editing a field allows another submission. SMTP acceptance does not guarantee inbox placement; submit a real inquiry after deployment and check spam as well as your inbox. Missing mail configuration or a database/SMTP failure returns a generic error without exposing credentials or claiming delivery.

For Gmail, use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=company.quitelogic@gmail.com`, a Google App Password in `SMTP_PASSWORD`, `SMTP_FROM=company.quitelogic@gmail.com`, and `SMTP_REQUIRE_TLS=true`. Keep these in server environment variables, never `NEXT_PUBLIC_*`. Redeploy/restart the Node application after changes. Keep `APP_URL` and `NEXT_PUBLIC_SITE_URL` aligned with the actual HTTPS origin used by visitors.

See [contact email implementation and validation](qa/CONTACT-EMAIL-REPORT.md) for behavior, deployment settings and test coverage.

## Shared graph background

`components/background/GraphBackground.tsx` mounts once inside the root providers and keeps the same Canvas 2D renderer during client navigation. It selects public, admin (50% intensity), or authentication (85%) styling from the current route. No new packages, environment variables or backend setup are needed. The previous global ambient layer and hero-only WebGL network are replaced by this shared system; the interactive service dice and other page/card animations remain.

The graph is fully autonomous: nodes drift on 8–20 second cycles and nearby connections draw in, hold, fade, then reconnect to other neighbors. A sparse candidate pool is built on resize; active connections are limited to three per node. Connection timings are staggered (0.8–1.5 second fades, 2–6 second holds), with at most three automatic data signals, or one on mobile/touch. No graph cursor, hover, mouse or scroll handlers are registered. The separate website cursor and card lighting remain unchanged.

Responsive density is 22/34/56/76 nodes, with DPR capped at 1.5 on desktop and 1 on mobile/touch. The loop targets 60 FPS on desktop and 30 FPS on mobile/touch, yields background paints when page frames arrive slowly, stops in hidden tabs and becomes a static graph for reduced motion. Animation state stays outside React. The footer retains its single opaque `#303944` background. Dense admin lists/forms retain their semisolid surfaces.

See [graph background implementation and validation](qa/GRAPH-BACKGROUND-REPORT.md) for architecture, lifecycle checks and device coverage. The existing app has no Clients or Inbox routes; any future screens under the same layouts inherit the graph automatically.

## Storage and security

Small logos are stored persistently in MongoDB as WebP, behind a storage utility in `lib/project-storage.ts`. Upload accepts PNG/JPEG/WebP, up to 2 MB and 16 megapixels. Sharp decodes and re-encodes the image, checks MIME against its actual format, removes metadata, rejects SVG and animated images, and bounds output dimensions. No writable server disk or third-party storage account is required. The adapter can later be replaced with S3 or Cloudinary.

New uploads also store a small card thumbnail. Existing uploads continue to work through a fallback. Restart a running development server after updating the image schema so its model includes the thumbnail field.

Images are publicly accessible only while referenced by a published project. Authenticated admins can preview drafts. Abandoned/replaced uploads remain in MongoDB for safe reuse; periodically remove unreferenced images after a retention period if storage grows. Back up MongoDB, including the image collection.

Server checks protect every admin page and API. Passwords use salted scrypt; opaque 256-bit sessions are stored as SHA-256 hashes and expire in eight hours. Cookies are HttpOnly, SameSite=Strict and Secure in production. Sessions are checked against an account version for immediate revocation. JSON bodies, upload streams, IDs, status values, URLs and slugs are validated. Browser mutations require the configured same origin. MongoDB-backed rate limits cover login, recovery, review submission and uploads; sessions and rate-limit records have TTL indexes. Expiration checks do not depend on TTL cleanup timing. Lists are paginated and public projections omit private fields. Public database reads are deduplicated per render and intentionally read current moderation/publication state.

## Production

This application now requires a **Node.js server**. Static `out/` deployment cannot run its admin panel or APIs. The old static preview/finalization scripts and Apache `.htaccess` are legacy artifacts and are not used by `build` or `start`.

1. Create a MongoDB Atlas database/user with access limited to this application database. Allow the application host's network address. A replica set is required for transactional reordering; Atlas provides one.
2. Set `MONGODB_URI` with the database name, `APP_URL` to the exact public HTTPS origin, and `NEXT_PUBLIC_SITE_URL` to the same origin. Rebuild when changing the public URL.
3. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` using a sender authorized by your mail provider. Port 465 uses TLS; 587 uses STARTTLS. Leave `SMTP_REQUIRE_TLS=true` for production. Optionally set `CONTACT_TO` to override the company inquiry inbox. Verify real contact and reset email delivery.
4. Run `npm run admin:create` and `npm run db:seed` against that database from a trusted machine. These initialize model indexes as well as content/accounts. Never use production credentials for tests.
5. Run `npm run lint`, `npm run typecheck`, `npm run build`, then `npm start`. Set the host's `PORT` as needed. Deploy source/build and production dependencies to a Node-capable host, not an old static web root. Use HTTPS and a reverse proxy with body/time limits.
6. Set `TRUST_PROXY=true` only when a trusted proxy overwrites `X-Forwarded-For`. Without it, IP-based limits safely share a bucket; per-email/admin limits remain active. Configure edge rate limiting for public reads and large/slow requests.
7. Verify login/logout, a real password-reset email, logo uploads and publication on the final HTTPS domain. Monitor delivery failures and MongoDB availability, and enable backups.

See [implementation report](qa/MONGODB-ADMIN-REPORT.md) for files, routes and validation results.
See [portfolio and Social Links update](qa/SOCIALS-PORTFOLIO-REPORT.md) for the latest layout, compact header CTA and reduced-motion-aware admin animation changes.
See [booking experience](qa/BOOKING-REPORT.md) for the official Calendly embed, progress events, motion, validation and account-side branding setup. The booking shell keeps the existing meeting URL and loads Calendly only when opened. Branding removal is controlled by the Calendly account; internal Calendly dates, times and fields retain their vendor behavior.

## Validation

```sh
npm run lint
npm run typecheck
npm run build
npm run test:admin
```

`test:admin` launches a disposable local MongoDB replica set, local SMTP sink and the production Next.js server on ports 3217/3218. It checks auth, CSRF, moderation/privacy, upload validation, project CRUD/reordering, reset email delivery and one-use/expired tokens, password changes, server restart/session persistence, contact delivery/rejection/retry/rate limits, responsive admin screens, then the existing Playwright browser suite. It never uses the production database or SMTP credentials. The first run downloads a MongoDB test binary; Chromium must be installed (`npx playwright install chromium`). Set `ADMIN_TEST_PORT` to use another port pair. All child services stop afterward. `npm run test:e2e` can also target an already configured local test server using `E2E_BASE_URL`. Contact browser tests submit mail: use only the local SMTP test server.
