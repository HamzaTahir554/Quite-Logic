# Quiet Logic visual and motion update

Historical report for the split hero. See [REFERENCE-REPORT.md](REFERENCE-REPORT.md) for the current Quite Logic design.

October 15, 2026. Updated the existing Next.js, MUI, and R3F application in place.

## Delivered

- A rounded 42/58 split hero, smoky glass content panel, near-black R3F panel, exact requested headline and eyebrow, ordered CTAs, and discipline pills.
- A draggable, pointer-responsive terminal with staged command output, typing, floating motion, border glow, and an explicitly illustrative preview label.
- Framer Motion route curtains and page masks, magnetic CTA links, a desktop cursor with VIEW/DRAG states, ambient backgrounds, and scroll progress.
- Selectable R3F service blocks with an equivalent keyboard-accessible DOM selector. Labels use local canvas textures, with no external font requests. Offscreen and background-tab rendering pauses; geometry and DPR are reduced on mobile. Reduced-motion and unsupported-WebGL visitors retain a usable selector and static visual.
- GSAP ScrollTrigger service artwork and capability reveals, scoped with matchMedia and reverted on unmount.
- About-page parallax typography and layered geometry; work-page sticky workflow graphic and scroll-selected stages; portfolio perspective, glow, masks, and layout filters.
- Contact field entrance/focus/validation feedback, magnetic submission button, and drawn success animation. Submission is disabled until hydration completes, and all controls reset after successful delivery.
- Existing real routes, SEO metadata, validation, and delivery API retained.

## Verification

Production build and strict TypeScript compilation pass. Browser coverage includes exact copy and split ratio, all six routes at seven widths, mobile stacking/navigation, keyboard service selection, motion-enabled client navigation, scene lifecycle, workflow progression, portfolio filters, contact states, SEO endpoints, and 404 behavior.

Final Playwright run: **8 tests passed in 38.7 seconds** against the production build, including both reduced-motion and motion-enabled behavior.

Full-page desktop, tablet, and mobile captures are in `qa/screenshots/`. Motion-enabled hero captures and an interactive service-block capture are included. Reviewed the homepage and every core page visually. The written update attachment contained no reference screenshot, so direct visual comparison to that new reference could not be performed; implementation follows its written proportions, palette, and interaction requirements.

## Limits

No claim of measured 60 FPS, Lighthouse scores, or full WCAG conformance. Email delivery still needs the existing environment configuration; successful UI delivery was simulated in browser tests. Hosting remains unchanged. No production deployment was performed.
