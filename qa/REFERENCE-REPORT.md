# Quite Logic reference update

October 15, 2026. This supersedes the previous split-hero design and its verification report.

## Design and branding

Reviewed the latest written brief and the screenshot attached in the conversation. Preserved its centered composition, large stacked off-white type, restrained blue emphasis, smoky background, faint emblem/rings, muted supporting text, paired CTAs, and small service labels. The headline and eyebrow use the exact wording from the written brief rather than the older wording shown in the reference image.

Removed the split terminal hero and its unused CSS. The new hero uses a single responsive composition, subtle pointer parallax, controlled entrance reveals, sparse particles, and low-complexity R3F geometry behind readable content. Mobile keeps the same hierarchy with stacked CTAs and lighter scene rendering. Reduced motion retains the static composition.

Brand spelling is **Quite Logic** throughout the live UI, metadata, manifest, structured data, social previews, and inquiry messages. A reusable wordmark renders “Quite” in `#F0F1F8` and “Logic” in `#2F80FE`. Original supplied Q icon assets are retained.

All six core pages and existing portfolio/contact behavior are preserved. Service cubes now respond to scroll as well as selection, hover, and pointer movement without feeding scroll updates through React state every frame.

## Verification

Final production-server run: **10 Playwright tests passed in 44.1 seconds**. Reviewed the final hero capture against the supplied screenshot and reviewed captures of all six pages.

- Production build and strict TypeScript compilation pass.
- Browser tests verify exact hero text, centered layout, mobile CTA stacking, brand spelling/colors, and the reduced-motion fallback.
- Initial motion-enabled layout-shift test passes the CLS threshold of 0.1 in local Chromium. This is a local observation, not a field Core Web Vitals certification.
- All six routes are checked at 320, 375, 425, 768, 1024, 1280, and 1440 pixels for horizontal overflow, headings, metadata, and browser errors.
- Internal page links and section targets are audited for valid destinations.
- Motion-enabled client navigation, scene cleanup, keyboard service selection, workflow progression, portfolio filtering, form validation/loading/failure/simulated success, SEO endpoints, and the branded 404 are covered.
- Updated desktop, tablet, and mobile captures are in `qa/screenshots/`; motion-enabled hero and service-cube captures are included.

## Limits

No claim of 60 FPS on every device, zero possible memory leaks, or a measured Lighthouse score. Real email delivery still requires the configured provider credentials and a live delivery check. Deployment and hosting are unchanged.
