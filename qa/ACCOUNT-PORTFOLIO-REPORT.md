# Account, portfolio and contact update

Implemented in the existing Quite Logic Next.js app. Neon migration 002 was applied successfully; it adds password recovery and portfolio tables and imports the existing concepts once. Existing concept routes, homepage showcases, branding, reviews, Calendly, and SEO remain intact.

## Changes

- Subtle footer Admin Login link.
- Forgot password, single-use 30-minute reset links, reset form, protected change-password form, Account navigation and logout. Passwords are salted scrypt hashes. Reset tokens are random, hashed in storage, consumed transactionally, and delivered in URL fragments to avoid request logs. Password changes invalidate all sessions and reset tokens.
- Generic recovery responses for known/unknown accounts; rate-limited email work executes after the response. No production test bypass or public token-return endpoint.
- Admin portfolio create/edit/delete/publish/unpublish/reorder, validated PNG/JPEG/WebP upload, WebP optimization and persistent database image storage. Only published listings/images are public.
- Portfolio cards show title/image with 300ms upward description panels, hover/keyboard access and touch reveal plus CTA/second-tap navigation. Reduced motion is respected.
- Contact root cause fixed: localhost and 127.0.0.1 were rejected as different origins. Equivalent loopback hosts are now accepted on the same scheme/port; explicit public deployment origins are supported without trusting arbitrary forwarded hosts or enabling wildcard CORS.
- Contact API and browser feedback use friendly errors. Stored inquiries survive notification failure, and the visitor is explicitly told when delivery was not confirmed.

## Verification

- Production build and TypeScript passed.
- 32 regression/origin tests passed with email disabled. Three mail-dependent tests were deliberately skipped in that run, then passed in the separate capture-enabled suite (4/4 including the origin test): 35 distinct tests passed across both configurations.
- Recovery mail capture, unknown-account response equality, hash-only token storage, token expiry/replay rejection, current-password validation, successful reset/change and session revocation verified.
- Portfolio CRUD, upload rejection, draft-image authorization, public publishing, edits, saved order, desktop hover, keyboard access, mobile CTA navigation and deletion verified.
- Contact accepts local aliases, captures delivery to the official inbox, reports notification failures honestly, rejects hostile origins and has the footer admin link.
- Existing seven-width public-layout checks, routes, SEO, review moderation, login, cursor, service cube, banners, contact feedback and Calendly passed.
- Five screenshot captures reported zero browser errors and no account-page mobile overflow: `portfolio-managed-default.png`, `portfolio-managed-hover.png`, `admin-portfolio.png`, `admin-change-password-mobile.png`, `admin-forgot-password-mobile.png` in `qa/screenshots/`.

## Live email limitation

The configured Gmail credential was checked against Gmail SMTP and rejected with authentication status 535 (EAUTH). No live email was sent. Contact and recovery delivery were verified through isolated local capture only. Replace GMAIL_APP_PASSWORD with a valid Google App Password for company.quitelogic@gmail.com, then verify live delivery. Do not paste credentials in chat. See ADMIN-SETUP.md for deployment origins and setup.
