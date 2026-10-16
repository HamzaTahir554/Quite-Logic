# Quite Logic — editorial, crystal and contact refresh

- Home retains Hero, Services, Selected concepts and the final CTA. Philosophy and How We Work remain available on their other pages. The hero eyebrow is removed.
- Services uses the five supplied images in alternating editorial rows, with preserved service anchors, descriptions, capabilities and contact links. The Services-only sculpture markup, scroll controller and styles are removed. Shared Three.js/R3F dependencies remain necessary for Home.
- Button hovers use 200 ms scale and arrow motion with sharp text. Section entrances use 380–450 ms motion; route curtains total about 400 ms. The desktop cursor has a blue dot/ring and VIEW/OPEN states. Touch and reduced-motion users retain native interactions.
- Smoky gray surfaces, bounded banner parallax, static glass treatment and hover reflections are applied without animated blur. Filled buttons use a deeper blue for white-text contrast while the brand accent remains #2F80FE.
- Contact offers message and meeting options. The official email is linked; the official Calendly page loads on demand in an accessible modal. Live verification displayed “30 Minute Meeting” and “Select a Date & Time.” No meeting was booked.
- Server delivery targets company.quitelogic@gmail.com by default, validates inputs, checks origin/payload size, rejects the honeypot, and limits inquiries per process. Provider errors preserve form input. Server tests mock Resend; no test email was sent.

## Verification

Production build and TypeScript checks pass. The 27-test suite covers existing routes and SEO, seven viewport widths, images, keyboard/touch interactions, absence of physical sensor access, reduced motion, cursor and banner movement, booking behavior, contact states, delivery payloads and rate limits. A test that attempted scrolling before hydration was corrected to wait for application readiness; affected tests pass on rerun.

The final [local motion sample](refresh-metrics.json) reports zero CLS and no horizontal overflow on Services and Contact, with no browser runtime errors. The header's former `top` animation was replaced with a transform to remove an observed layout shift. The headless browser's blank-page RAF sample was about 37 frames/second, so these measurements cannot establish consistent 60 FPS on physical devices.

Screenshots are in `qa/screenshots/`, including refreshed Home, Services, Contact, mobile Contact and the live booking modal.

## Remaining external setup

Live email delivery is not verified. Resend rejected the supplied key as invalid; the private settings still require a valid `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` on a verified sending domain. Gmail is the destination inbox. Secrets belong in `.env.local` or hosting environment settings, not the example file or frontend. The supplied credential was checked against compiled browser assets and was absent.

Calendly's iframe content remains controlled by Calendly. The provided URL is reachable and its calendar was visually verified; a booking itself was not submitted. Per-process rate limits should be complemented by shared edge limits on a multi-instance deployment.
