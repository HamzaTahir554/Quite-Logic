# Mobile Day Mode correction

Follow-up: the mobile page plane and canvas now receive an opaque light base. See the [Home projects and mobile rendering report](HOME-PROJECTS-REPORT.md) for the latest changes, validation and Pixel-profile capture. The diagnosis below records the earlier iteration; physical Pixel verification remains outstanding.

## Diagnosis and limits

The supplied screenshot is from a Google Pixel 7a. Ordinary Chromium touch emulation at 320, 375, 390, 412 and 425px did not reproduce the exact black stripe. The paint audit found that `.graph-background::after` supplied a fixed, viewport-wide radial gradient in Day Mode, fading from transparent at its center to the Day background at its edges. It was the only page-wide gradient matching the reported vertical shape. The document root itself had a transparent background. The exact physical-device cause remains unconfirmed.

Chrome's forced darkening diagnostics reproduced unreadable Day rendering, with a different appearance from the original screenshot. The explicit DevTools override also bypassed the tested CSS opt-out; those forced diagnostics do not establish the phone's settings or prove the source of its stripe. The ordinary and Pixel-profile captures are the acceptance evidence for this change. No physical Pixel or installed WebKit browser was available here.

## Source changes

- The shared graph's ambient pseudo-element is now explicitly Night-only. Day Mode has `content: none` and no background image on that pseudo-element. No new covering panel was introduced.
- Day gives the document root a light base matching the body and declares `color-scheme: only light`, the standard opt-out for browser automatic color adjustment. See [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme). Night selection remains available through the existing provider.
- The Day hero fade now uses the light palette. Its dice shadow uses a soft gray tone without a blur filter, the Atlas visual uses light illumination, and the project-image hint uses a light surface. Mobile Day omits the old atmospheric glows and crystal light; normal clay shadows remain.
- Mobile Day descriptions are 16px with 1.65 line height. Meaningful small labels are 11px and use the existing dark secondary color. The body-copy color `#465463` on `#E8ECF1` has a calculated 6.53:1 contrast ratio. Major section headings scale between 34 and 42px, and section spacing uses the existing rhythm tightened to 60px.
- Mobile Day draws 20 graph nodes with softer gray/blue connections. The existing 22-node solver, connection rotation, animation clock and canvas remain alive through theme changes; two distributed nodes and their attached edges are omitted from Day mobile drawing. Night and larger-screen density stay unchanged. No cursor interaction was added.

Header markup, route structure, MongoDB, authentication, project management, reviews, SMTP, Calendly and SEO were not changed.

## Verification

New browser checks cover all five requested widths on Home, Services, About, Work, Portfolio, both Nexa and Atlas details, Contact, Reviews and authentication pages. They verify light base colors, no global Day gradient, no overflow, readable text, header centering and one visible heading. A separate screenshot pixel check samples the actual painted backdrop across its center and sides with foreground content hidden only inside the test. Day/Night toggles preserve canvas identity, update graph colors/density, remove the ambient layer on return to Day and retain the saved preference after reload.

Authenticated mobile checks cover Dashboard, Reviews, Portfolio, Settings and Account at all five widths. Existing lifecycle and graph tests cover autonomous reconnection, hidden tabs, reduced motion and cleanup. The desktop glass test now centers its target and waits for scroll events before hovering, avoiding the existing scroll-clears-lighting timing race without changing application behavior.

Build, lint, TypeScript, formatting and whitespace checks passed. The completed full regression run passed **318 integration assertions and 70 browser tests** using disposable MongoDB and a local SMTP sink. After correcting the final mobile metadata selector priority, the application was rebuilt and all **16 mobile Day, theme and portfolio tests passed again**. That focused run disabled database access, so expected unavailable-service logs from database-backed reads appeared; it exercised public fallbacks rather than production services. The full integration run checked the real application workflows against its disposable database.

Captures and computed-style audits are in [mobile-day](mobile-day/). `before` and `after` use ordinary Chromium. `pixel-after` uses Playwright's Android Pixel 7 profile with 2.625x device scale, including the requested 412px touch layout; it is not a physical Pixel 7a rendering test. `pages` includes public and authenticated Admin captures. The local screenshot audit disables external database access; full integration tests use disposable MongoDB and a local SMTP sink.

After deploying, verify the same scroll position on the original Pixel 7a. Local captures cannot guarantee behavior of that phone's GPU, browser flags, extensions or cached assets.
