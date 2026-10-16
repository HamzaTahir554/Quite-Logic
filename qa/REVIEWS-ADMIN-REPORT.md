# Client reviews / admin verification

Implemented in the existing Next.js project without replacing public routes or design.

- Homepage reviews and `/reviews` submission page; approved-only server rendering, private email, moderated image access, consent, validation, and Pending-by-default insertion.
- `/admin/login` and authenticated dashboard, review moderation, client history, contact inbox, Gmail compose, and email history.
- Hosted PostgreSQL via `pg`, parameterized queries, atomic shared rate limits, salted scrypt credentials, hashed opaque sessions, Secure/HttpOnly/Strict cookies, origin checks, no-store admin responses, noindex admin pages.
- Contact inquiries are stored before email notification. Failed notifications are visible in the inbox without losing messages.
- Sharp profile image validation and re-encoding; no arbitrary URL fetching or SVG uploads.
- Direct RAF cursor dot, lightly interpolated ring, no positional spring, text-selection/native-input support, touch/reduced-motion disablement.
- Subtle public text reveals/hover scale, existing crystal styling and unrelated animations preserved.

## Checks

- Production build and TypeScript check passed.
- 31 Playwright tests passed across the full regression run and targeted reruns. Two initial regression failures were test assumptions: the isolated server changed the canonical origin, and the old invalid-contact request omitted Origin. The fixture now preserves canonical configuration; the validation test sends a valid Origin so it reaches field validation.
- New integration tests passed for Pending → Approved → edited → Rejected → deleted lifecycle; public image visibility; CSRF and unauthenticated access rejection; private-email exclusion; cookie attributes; logout revocation; persisted inquiries and client linking; missing-Gmail and invalid-email-header errors; login throttling; public/mobile forms; cursor edge accuracy and reduced motion.
- Existing checks passed for services, portfolio, branding, hero stability, SEO, routes, contact feedback, Calendly modal behavior, crystal banners, WebGL/CSS cube, no device sensors, native scrolling, and seven responsive widths (320–1440px).
- Five additional desktop/mobile screenshots in `qa/screenshots/`: `admin-dashboard.png`, `admin-reviews.png`, `client-reviews.png`, `admin-messages-mobile.png`, `client-reviews-mobile.png`. Visual capture reported zero browser errors and no mobile horizontal overflow. Screenshots contain clearly named disposable test clients only.
- Tests use loopback-only in-memory PGlite through the PostgreSQL protocol and the production `pg` adapter. Gmail and Resend credentials are explicitly disabled in the fixture; no live emails or bookings were sent.

## Deployment settings still required

Hosted `DATABASE_URL`, Gmail `GMAIL_APP_PASSWORD`, migration, and private admin bootstrap. See [ADMIN-SETUP.md](../ADMIN-SETUP.md). Live hosted connectivity and Gmail delivery have not been verified with production credentials. No deployment was performed.
