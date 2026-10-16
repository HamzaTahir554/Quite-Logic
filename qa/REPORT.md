# Quiet Logic verification

Verified October 15, 2026.

This records the initial build. See [UPDATE-REPORT.md](UPDATE-REPORT.md) for the subsequent split-hero and motion update.

- Next.js 16.4.1 production build: passed.
- TypeScript strict check: passed.
- Playwright: 5 tests passed in 23.5 seconds against the production server.
- All six core routes checked at 320, 375, 425, 768, 1024, 1280, and 1440 pixels. No horizontal document overflow, one primary heading per page, distinct titles, and expected canonicals.
- Mobile drawer: opening, Escape dismissal, and route navigation passed.
- Portfolio: filtering and concept detail navigation passed.
- Contact: client validation, server validation, cross-origin rejection, unconfigured delivery failure, preserved values, loading state, and simulated success passed.
- Sitemap, robots, manifest, social image endpoint, and branded 404 passed.
- Separate motion-enabled Chromium check: hero WebGL canvas rendered with no browser errors after pointer movement.
- Nine design screenshots plus a motion-enabled hero capture are in `qa/screenshots/`. Full-page captures use reduced motion and scroll through local imagery to load it before capture.

## Design review

Reviewed the full demo source, both provided branding assets, and all seven reference screenshots before implementation. Preserved the pill header, centered hero, smoky gray palette, blue accents, dimensional service blocks, split project panels, and orbital logo. Updated the hero copy to the requested tagline and extended the original single-page demo into real routes. Reviewed desktop, tablet, and mobile output captures.

## Launch dependencies and verification limits

- Not deployed. This project preserves the specifically requested Next.js runtime and server routes; it needs a compatible Next.js host. The available Sites hosting workflow uses a different Worker runtime, so it was not used to replace the requested framework.
- Set the final `NEXT_PUBLIC_SITE_URL` before a production build.
- Configure the Resend key, verified sender, and recipient to enable real email delivery. No real email was sent; success was simulated only for UI validation.
- Configure rate limiting/bot protection at your hosting edge before opening the contact endpoint publicly.
- Project concepts and social placeholders are labeled as such; no shipped client results are claimed.
- Automated checks do not establish a Lighthouse score, full WCAG conformance, or performance on every real mobile GPU.
