# MongoDB admin implementation

## Architecture found

The current working tree was a static Next.js 16.4.1 App Router site using React 19.3.1, strict TypeScript 7, MUI/Emotion, Framer Motion, GSAP and Three.js. Public routes included `/`, `/services`, `/about`, `/work`, `/portfolio`, existing `/portfolio/[slug]` case studies, `/reviews` and `/contact`, plus SEO routes. Portfolio/reviews loaded local JSON. The contact form prepared a browser email draft; Calendly was loaded on demand. There was no active authentication, database, storage or server mail transport. Old backend/admin files were already deleted in the user's working tree, with a private local archive. Those pre-existing changes were preserved.

Next.js's installed route, cookie, authentication, page, revalidation and deployment guides were read before implementation. The project now runs on Node.js; static export was removed because server authentication and database-backed APIs require a server. Public styling and editorial pages were retained.

## Added files

- Database/security: `proxy.ts`, `lib/mongodb.ts`, `lib/models.ts`, `lib/passwords.ts`, `lib/admin-validation.ts`, `lib/api.ts`, `lib/admin-auth.ts`.
- Data/storage/email: `lib/public-data.ts`, `lib/project-detail.ts`, `lib/project-storage.ts`, `lib/email.ts`.
- Admin: `app/admin/layout.tsx`, `app/admin/admin.css`, login/forgot-password/reset-password pages, `(protected)/layout.tsx`, dashboard/reviews/portfolio/account pages.
- Admin components: `AdminNav.tsx`, `AuthForm.tsx`, `ReviewManager.tsx`, `ProjectManager.tsx`, `ListControls.tsx`, `useAdminList.ts` under `components/admin/`.
- Public submission: `components/reviews/ReviewForm.tsx`.
- API route files listed below.
- Setup/validation: `scripts/setup-admin.ts`, `scripts/seed-portfolio.ts`, `scripts/test-admin.ts`, `scripts/test-mongo-binary.mjs`, `tests/admin-panel.spec.ts`, `eslint.config.mjs`, this report. The Windows helper downloads just the executable from the official MongoDB archive with bounded HTTP ranges and checks its ZIP CRC, skipping unused debug symbols.

Some paths above had existed in Git history but were absent from the initial working tree; their current contents implement MongoDB rather than restoring the deleted backend.

## Modified files

`package.json`, `package-lock.json`, `next.config.ts`, `.env.example`, `README.md`; `app/page.tsx`, `app/template.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/portfolio/page.tsx`, `app/portfolio/[slug]/page.tsx`, `app/reviews/page.tsx`, `app/reviews.css`; `components/layout/SiteChrome.tsx`, `components/layout/Footer.tsx`, `components/sections/Portfolio.tsx`, `components/reviews/PublicReviews.tsx`, `components/reviews/ReviewsSection.tsx`; `tests/frontend-only.spec.ts` (replaces obsolete assertions requiring the absence of the requested backend), `tests/service-cube.spec.ts` (a let-to-const lint correction only). Next.js also refreshed the generated `next-env.d.ts` references during the build.

## Packages

Runtime: `mongoose`, `nodemailer`, `server-only`, explicit `sharp` dependency. Development: `@types/nodemailer`, `tsx`, `mongodb-memory-server`, `eslint` 10, `typescript-eslint`, `eslint-plugin-react-hooks`. TypeScript 7 remains the `tsc` compiler via `@typescript/native`; the `typescript` package is aliased to Microsoft's `@typescript/typescript6` compatibility API for ESLint. This follows [Microsoft's side-by-side configuration](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0), since TypeScript ESLint cannot consume the TypeScript 7.0 API. Direct TypeScript/React Hooks lint rules avoid the Next.js lint preset's currently unpatched development-only glob dependency chain. The resulting audit reports zero vulnerabilities.

## MongoDB models

- `Admin`: normalized unique email, hidden password hash, session version, hidden reset-token hash/expiry, timestamps.
- `AdminSession`: unique token hash, admin reference, account version, expiry with TTL index.
- `Review`: clientName, company, role, hidden email, service, integer rating validated by API, review, pending/approved/rejected status, timestamps. Indexed by status/date/ID.
- `Project`: title, unique slug, logo, description, shortDescription, category, technologies, projectUrl, sourceSlug, featured, draft/published status, display order, timestamps. Indexed by status/order/ID.
- `ProjectImage`: hidden WebP buffer, MIME, size, creating admin, timestamps.
- `RateLimit`: hashed bucket key, atomic counter, TTL expiry. The key includes the fixed time window; enforcement does not wait for TTL deletion.

One cached MongoDB connection promise/pool is reused per process and across development reloads. Failed/disconnected connections can be retried. The driver handles temporary connection loss. No connection is opened/closed for each API request.

## Environment variables

Safe template: `.env.example`. Required: `MONGODB_URI`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`. Recovery email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_REQUIRE_TLS`. Optional `TRUST_PROXY` only behind a trusted proxy that overwrites the forwarded-IP header. Production URLs must use HTTPS; no URI, password, SMTP secret, session token or reset token is hardcoded or returned by public APIs.

## API routes

| Route | Methods | Access |
| --- | --- | --- |
| `/api/admin/login` | POST | Origin-checked, rate-limited credentials |
| `/api/admin/logout` | POST | Origin-checked, destroys current session |
| `/api/admin/forgot-password` | POST | Origin-checked, rate-limited generic response |
| `/api/admin/reset-password` | POST | Origin-checked, rate-limited valid one-use token |
| `/api/admin/change-password` | POST | Authenticated admin, current password |
| `/api/admin/reviews` | GET | Authenticated admin; pagination/search/status |
| `/api/admin/reviews/[id]` | PATCH, DELETE | Authenticated admin; ID/status validation |
| `/api/admin/projects` | GET, POST | Authenticated admin; pagination/search/status/create |
| `/api/admin/projects/[id]` | PATCH, DELETE | Authenticated admin; validated changes |
| `/api/admin/projects/reorder` | POST | Authenticated admin; transactional adjacent move |
| `/api/admin/uploads` | POST | Authenticated admin; bounded validated image upload |
| `/api/project-images/[id]` | GET | Published project logo, or authenticated preview |
| `/api/projects` | GET | Published public projection; bounded pagination |
| `/api/reviews` | GET, POST | Approved public projection; pending-only submissions |

All JSON responses are no-store. Private image responses are no-store, including after unpublishing. CSRF defense combines SameSite cookies with strict origin checks on mutations. Protected APIs check authorization independently of page layouts. IDs and payloads are validated before queries. Unexpected database errors return generic messages without internal error details.

## Admin routes

`/admin/login`, `/admin/forgot-password`, `/admin/reset-password?token=…`; protected `/admin`, `/admin/reviews`, `/admin/portfolio`, `/admin/account`. A lightweight proxy redirects requests without a session cookie before a loading shell streams. Both the shared protected layout and each protected leaf page verify the actual database session, with duplicate checks deduplicated per render. Admin pages are noindex/nofollow and use no-referrer metadata. Public custom cursor and heavy page animations are omitted from the admin area.

## Workflows

Review: visitor submits → validated/rate-limited API → MongoDB pending → admin approval/rejection/deletion → only approved projection appears on home/reviews/API. Email never appears in public responses. Existing review cards are reused.

Portfolio: admin uploads validated durable logo → creates draft → edits/publishes → published project appears automatically in database-backed portfolio/API, with generated detail route when needed. Desktop hover and keyboard focus reveal the sharp description upward; first touch reveals, separate CTA navigates. Initial cards display only logo/title. Existing curated concept case studies remain independent editorial routes. Slugs are unique, display order is editable, and transactional earlier/later movement normalizes tied ranks. Lists have pagination; public pages offer load-more controls.

Forgot/reset: always the same account-existence response for a syntactically valid email. A 256-bit random reset token is hashed with SHA-256, expires after 30 minutes, is sent through SMTP using the trusted configured origin, and is consumed atomically. Weak/mismatched passwords, unknown/expired/used tokens fail. Successful reset increments the session version and removes sessions. Delivery failures clear the corresponding token and log a generic configuration error.

Change password: verifies the current scrypt hash, validates strength/confirmation, rejects unchanged passwords, writes a fresh salted scrypt hash, clears reset state, increments the account session version and signs out all sessions. Sign in again after success.

Logo upload: MongoDB persistent small-image storage, not local disk. The storage utility is a replaceable boundary for S3/Cloudinary. PNG/JPEG/WebP only, maximum 2 MB input and output, 16 megapixels, MIME/decoded-format match, no animated uploads, bounded dimensions, metadata stripped by WebP re-encoding. Admin preview is protected; only logos referenced by published projects can be fetched publicly. Unreferenced uploads are retained for safe reuse; add a retention cleanup job if storage growth warrants it.

## Validation

Final results on October 18, 2026:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no errors or warnings |
| `npm run typecheck` | Passed, TypeScript 7 compiler |
| `npm run build` | Passed, including all admin/API routes and proxy |
| `npm run test:admin` | Passed: 105 checks, including 104 workflow assertions and the regression-suite result |
| Playwright regression suite | 29 passed in 1.7 minutes; only the pre-existing full-site screenshot capture test excluded |
| Dependency audit | Zero vulnerabilities after removing the unused vulnerable lint dependency chain |
| `git diff --check` | Passed; Git reported Windows line-ending normalization notices only |

MongoDB connection/reconnection, transactions and application restart persistence were verified against a real disposable MongoDB 8.2.6 replica set. SMTP reset email delivery was verified using a local SMTP sink. Authenticated admin layouts were checked at 375, 768, 1024 and 1440 pixels; existing public-page tests cover widths from 320 to 1440 pixels. Portfolio mouse hover, mobile/tablet taps, keyboard navigation, reduced motion, logo loading and public data privacy passed. No browser JavaScript exceptions were observed. The dashboard screenshot was inspected at `qa/admin/dashboard.png`. All test child services were stopped afterward.

Next.js streams `notFound()` responses from dynamic detail pages with a 200 status when the loading shell has already been sent; tests verify noindex metadata and absence of draft title/description as well as exclusion from public APIs. Original editorial case studies remain public by design. Production Atlas connectivity, real provider deliverability, proxy/TLS hosting configuration and database failover behavior still require validation in the final hosting environment.

The integration runner uses a disposable MongoDB replica set and local SMTP sink, never production credentials. It verifies route/API authorization, bad credentials, CSRF, invalid IDs, escaped search, bounded pagination, pending/approved/rejected privacy, email omission, deletion, upload corruption/type/size/MIME checks, draft image privacy, project CRUD, duplicate slugs, unsafe URLs, publishing/unpublishing, details, reorder, reset email delivery/hash/expiry/confirmation/strength/concurrency, password changes, session revocation, database reconnection, server restart, logout/rate limits and responsive authenticated browser workflows. The existing Playwright suite covers preserved public pages, SEO, motion, contact email drafts, booking and responsive behavior; additional tests cover hover/touch/keyboard interaction and admin login/recovery responsiveness.

## Production/manual steps

1. Supply a real Atlas URI with database name and database-scoped credentials. Configure network access and backups. Atlas supports the transactions used by reordering; standalone MongoDB does not.
2. Set both site origins to the final HTTPS domain and configure authorized SMTP delivery. A real provider's sender authorization/delivery must be verified separately from the local SMTP test.
3. Run `npm run admin:create` (hidden password prompt) and `npm run db:seed`. The seed uses upserts with set-on-insert to preserve later admin edits.
4. Run the documented checks, build and deploy to a Node.js-capable host using `npm start`. Old `out/` static hosting cannot execute this backend.
5. Verify HTTPS login, live password reset delivery, logo upload and public moderation on the final host. Configure proxy request limits and trusted forwarded-IP handling where appropriate.

No production Atlas connection or real email provider is configured by this task. No live site was deployed, and no existing remote account/database was changed.

Reference documentation: [Mongoose connections](https://mongoosejs.com/docs/connections.html). Framework behavior was checked against the repository's installed Next.js documentation.
