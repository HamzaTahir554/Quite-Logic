# Portfolio alignment, Social Links and admin motion

## Scope

Updates the existing codebase, including the preceding admin UX work. Existing public routes, metadata, editorial project pages, contact email drafts, Calendly, authentication and review/project workflows are retained. The supplied attachment contained the written request only; no reference screenshot was available, so the current site was reviewed through browser captures.

## Changes

- Portfolio hero, filters, count, cards, skeletons and empty state share the site's responsive container width. The portfolio's inherited slate rectangle and floating hero decoration are removed locally. Heading/filter/count gaps are explicit, and the empty state has centered, balanced typography and padding. Other page heroes retain their existing design.
- The header meeting CTA uses a 40px desktop height with smaller padding, text and arrow. On mobile it uses a 36px height, remains beside the menu and becomes an accessible icon button on very narrow screens. Booking behavior is unchanged.
- `/admin/settings` adds Social Links to the desktop/sidebar drawer navigation. The form supports LinkedIn, Instagram, GitHub, Facebook, X / Twitter and YouTube; required URL validation, visibility, order, inline feedback, disabled processing controls, duplicate-submit protection, unsaved-change warnings and confirmed deletion reuse the existing admin patterns. Reorder buttons work even when numeric ranks tie.
- A new timestamped MongoDB `SocialLink` model stores platform, URL, enabled state and order, with a unique platform index and a public sort index. New links are disabled by default. `/api/admin/socials`, `/api/admin/socials/[id]` and `/api/admin/socials/reorder` require the existing session and mutation-origin checks. Reordering uses the existing MongoDB transaction setup. HTTP(S) URLs are validated, credential-bearing and executable URLs rejected, fields strictly validated and public projections limited to display fields.
- `/api/socials` returns enabled links in display order. The footer fetches uncached links on navigation/tab return and uses consistent labelled SVG icons and safe external anchors. No social profile URLs are hardcoded or seeded. With no links or an unavailable database, no broken social anchors are shown. A fixed minimum area prevents loading links from moving footer content.
- Admin pages enter in 300ms, forms/tabs in 240ms, buttons/status changes in 180ms, cards in 220ms, dialogs/toasts in 180ms and the drawer in 200ms. The active sidebar background moves between sections. Native selects retain their standard keyboard/mobile behavior. Reduced-motion preference disables added transforms/animations and sets MUI transition durations to zero.

## Main files

- Layout: `app/portfolio/page.tsx`, `app/portfolio.css`, `app/studio.css`, `components/booking/BookingProvider.tsx`.
- Socials: `lib/social-links.ts`, `lib/models.ts`, `lib/admin-validation.ts`, `lib/api.ts`, `app/api/socials/route.ts`, `app/api/admin/socials/`, `app/admin/(protected)/settings/page.tsx`, `components/admin/SocialLinkManager.tsx`, `components/layout/SocialLinks.tsx`, `components/layout/Footer.tsx`, `components/ui/SocialIcon.tsx`.
- Admin motion/access: `proxy.ts`, `components/admin/AdminNav.tsx`, `AdminIcon.tsx`, `AdminFeedback.tsx`, `ProjectPreview.tsx`, `ReviewManager.tsx`, `app/admin/admin.css`.
- Verification: `scripts/test-socials.ts`, `scripts/test-admin.ts`, `tests/admin-panel.spec.ts`. Captures are saved under `qa/socials-portfolio/`.

## Validation and operation

- `npm run build`, `npm run lint`, `npm run typecheck` and `git diff --check` passed.
- `npm run test:admin` passed with 163 assertions (162 integration/workflow assertions plus the browser-suite result) and all 30 Playwright regression tests.
- Social-link checks covered authentication on every admin endpoint, mutation origins, unsafe/invalid URLs, duplicate platforms, strict fields, partial edits, disabled-link privacy, restricted public fields, tied-order reordering and deletion. Browser checks covered inline validation, retained values after a failed save, duplicate-submit prevention, unsaved navigation, public footer updates, visibility switches, editing, reordering, confirmation/cancel flows and reduced motion.
- Portfolio measurements verified equal hero/filter/empty-state widths and left edges, centered empty-state content, spacing below wrapped filters and no horizontal overflow at 320, 375, 768, 1024 and 1440px. The meeting CTA remained within 40px height and 160px width, vertically centered in the header at every width. Settings forms were checked at 375, 768, 1024 and 1440px; lists at 375, 768 and 1440px.
- Screenshots were visually reviewed for the desktop/mobile empty portfolio, desktop settings list and mobile/desktop settings editor. Existing hover/touch/keyboard project cards, editorial case studies, contact email drafts, Calendly, public routes, metadata, branded 404, responsive pages and motion/WebGL fallbacks all passed their regressions. The contact regression permits only the footer's public social GET and still rejects any submission request.

Tests use disposable MongoDB, local SMTP and fictional profile URLs; production data and credentials are not modified. Test child services are stopped on completion. Dependency manifests and environment templates are unchanged.

No new dependencies, environment variables, storage providers or data migration are needed. Restart the development server, then open `/admin/settings` and enter the team's actual social profile URLs. No actual URLs were supplied, so the database is intentionally not populated with guessed profiles. Public social updates take effect on the next fetch; an already-open page refreshes them when it regains focus.
