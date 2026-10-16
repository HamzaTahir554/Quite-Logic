# Atlas / Cloud update

The previous project is replaced throughout active content, project cards, detail routes, metadata, sitemap, and the demo source. The old project URL exists only as a permanent 308 redirect and in its migration tests. Original reference screenshots are retained as reference assets; current QA screenshots are regenerated.

## Design

- Shared Atlas / Cloud showcase on the homepage, portfolio, and `/portfolio/atlas-cloud`.
- 43% copy / 57% terminal composition with a fine divider, rounded charcoal surfaces, exact eyebrow/description, and WEB APP / DATA UX / MOTION tags.
- CSS/DOM terminal with progressive command/output reveals, muted green checks, blue prompt, blinking cursor, 5px floating travel, and desktop pointer tilt capped at 2 degrees per axis. No additional WebGL canvas.
- Ambient lighting and floating effects pause offscreen or when the document is hidden. Touch disables mouse tilt. Reduced motion exposes all terminal output statically.
- Visible project breadcrumbs and matching three-level JSON-LD breadcrumbs.
- Charcoal `#0A0D12` / `#10151C` palette with restrained blue highlights and preserved two-color Quite Logic branding.

## Global motion

Services uses staggered words and outlined blocks; About uses a lateral mask and orbital artwork; Work uses horizontal word reveals and connected nodes; Portfolio uses a scale/mask reveal and layered frames; Contact uses gentle word reveals with pointer lighting. Project pages have their own masked treatment, and Atlas uses a dedicated staged showcase. Home keeps its existing centered line reveal.

Section reveals now stagger eyebrow, headings, copy, actions, and visuals. Existing project illustrations receive slow parallax/floating motion and restrained hover tilt. All newly created animation instances are canceled during cleanup. Native scrolling, existing R3F scene pauses, and reduced-motion support are retained.

## Verification

The production build and strict TypeScript compilation pass. The final production-server browser suite passed **14 tests in 55.9 seconds**, including redirects, metadata, breadcrumbs, sitemap, terminal sequencing, <=3-degree tilt checks, touch behavior, seven viewport widths, tablet/mobile header alignment, route navigation, scene cleanup, portfolio filtering/empty states, contact states, link audits, SEO endpoints, and the branded 404. The existing local layout-shift threshold test also passes. A separate motion-enabled audit of nine routes, including all project detail pages, reported no browser console errors or uncaught runtime errors.

Desktop, tablet, and mobile Atlas captures plus the homepage Atlas card are in `qa/screenshots/`; all core-page captures were refreshed. The written attachment contained no new reference image. Visual review therefore uses the detailed written specification; exact image fidelity cannot be verified against an absent image.

No claim of universal 60 FPS, a Lighthouse score, or real email delivery. The existing email configuration and hosting setup remain unchanged. A separate test server is used on port 3100 to avoid interfering with the process already using port 3000.
