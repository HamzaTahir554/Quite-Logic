# Meeting-booking experience

## Implemented

The existing meeting URL remains `https://calendly.com/company-quitelogic/30min`. Header, contact and CTA buttons still open one accessible on-site dialog. No routes, database schemas, dependencies or environment settings were changed for this update.

- A smoky gray/glass workspace uses the existing blue accent, typography, rounded panels and meeting introduction. Desktop has an introduction/progress column beside the calendar; tablet and mobile stack the content. Mobile uses the full viewport width so Calendly's 320px layout remains usable. The contact invitation also has an entrance reveal.
- The official JavaScript embed replaces the direct iframe implementation. Script loading is deferred until booking opens, shared across reopenings and retried after failures. The loader has slow/error feedback, a retry action, a permanent separate-tab link, cleanup on close and a labelled calendar frame.
- Documented calendar events drive Choose a time → Your details → Confirmed. Date selection alone does not falsely advance progress. Time selection is not presented as a confirmed meeting. Only `calendly.event_scheduled` shows success; unknown events, other origins and other windows are rejected. No booking payloads, invitee information or event URIs are stored or logged by the app.
- Introductions and calendar panels enter in 250–350ms; step copy changes in 300ms; controls/status highlights use 180–200ms. Confirmation draws a blue circle/check and reveals the success copy. A second small check/status in the persistent header makes confirmation visible even when a mobile user has scrolled down to the Calendly form. Reduced motion removes added decorative animation, including dialog motion, without changing the booking controls or states.
- The iframe is neither overlaid nor cropped. The calendar container permits visible overflow, and normal iframe/dialog scrolling keeps the entire vendor experience reachable. Loading/error messages occupy their own row. No cookie banner or branding suppression parameters are used.
- A regression investigation found the existing page-loading placeholder could expose the footer before streamed content arrived, producing a measured 0.25 layout shift. The placeholder now reserves a viewport of height; completed page layouts are unchanged. Motion tests target the visible banner/heading so Next's temporary hidden streaming copy is not mistaken for a second visible page. The layout-shift threshold remains unchanged, with element-level diagnostics retained in the test.

## Official Calendly configuration and limits

The integration uses the supported `background_color`, `text_color` and `primary_color` options. `hide_event_type_details=1` removes Calendly's duplicate introductory panel; the local introduction supplies the existing 30-minute meeting context. This option does not remove branding. See [Calendly's embed customization guide](https://calendly.com/help/how-to-customize-your-embed).

Progress uses the [official JavaScript embed and documented postMessage events](https://calendly.com/help/advanced-calendly-embed-for-developers), with additional frame-source checks. Customizing individual date cells, time slots, arrows, labels, fields, dropdowns or internal step transitions through parent CSS is unavailable across the cross-origin frame. Those controls retain Calendly's own interactions. The implementation animates the surrounding experience rather than injecting scripts/styles into the vendor document or inventing a replacement scheduling system.

The live read-only check showed the existing account still displays Calendly branding. Integration discovery found an available Calendly plugin, but it is not installed/connected; no account subscription/owner settings were accessed or changed. On an eligible plan, the owner/admin must open Calendly → profile menu → Branding → disable **Use Calendly branding** → **Save changes**. Organization/shared events may require the organization owner's setting. Once disabled there, this inline embed inherits the result without a code change. See [Calendly's official branding instructions](https://calendly.com/help/how-to-turn-off-calendly-branding-on-your-scheduling-page). No unsupported branding-hiding parameter or overlay was added.

## Validation

- `npm run build`, `npm run lint`, `npm run typecheck` and `git diff --check` passed.
- The final `npm run test:admin` run passed with 163 assertions (162 integration/workflow checks plus the browser-suite result) and all 34 Playwright browser regressions. MongoDB and SMTP integration checks use disposable local services, which shut down afterward.
- Booking checks cover lazy script loading, one script across reopenings, genuine frame/origin validation, unknown/spoofed messages, date/time/details/back/confirmation state changes, retained visible vendor branding, script failure/retry, slow-load feedback, close before script readiness, stale initialization cleanup, fallback links, keyboard access, touch and reduced motion. Responsive checks passed at 320, 375, 768, 1024 and 1440px without horizontal overflow. The booking workflow reported no uncaught browser errors.
- The previously failing layout test passed its unchanged `< 0.1` CLS threshold after the loading-placeholder fix. Existing admin, MongoDB/social links, public portfolio, contact draft, SEO, route, editorial animation and WebGL fallback checks also passed.
- Read-only live checks loaded the official Calendly script and the existing scheduling URL successfully (HTTP 200), reviewed desktop/mobile rendering and selected a real available date/time to reach the blank attendee form. The actual `calendly.date_and_time_selected` message came from the active frame and correctly advanced the local progress to Your details. No attendee information was entered and the live form was not submitted.

Browser fixtures are explicitly labelled and live under `tests/fixtures/`; they exercise the integration contract without creating appointments. Fixture screenshots under `qa/booking/` end in `-fixture.png` and are not representations of Calendly's actual field styling. Live captures are named `live-*.png`.

Reviewed captures: [live desktop calendar](booking/live-desktop.png), [live mobile calendar](booking/live-mobile.png), [live blank details form](booking/live-details-desktop.png), [fixture desktop confirmation](booking/desktop-confirmation-fixture.png), and [fixture mobile confirmation](booking/mobile-confirmation-fixture.png).

No real appointment was submitted and no attendee email was sent. A real booking confirmation/email-delivery check requires the account owner to choose an appropriate slot and attendee after reviewing the result.

## Files

`components/booking/BookingProvider.tsx`, `components/booking/CalendlyEmbed.tsx`, `lib/calendly.ts`, `app/booking.css`, `app/layout.tsx`, `app/contact/page.tsx`, the loading-shell rule in `app/globals.css`; `tests/booking.spec.ts`, `tests/fixtures/calendly.ts`, `tests/crystal-contact.spec.ts`, `tests/brand-hero.spec.ts`, and this report/README.
