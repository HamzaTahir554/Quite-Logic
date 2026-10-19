# Quiet Logic glass system

The existing App Router website now shares a smoky glass visual system across public pages and admin. The original gray/blue background identity, routes, page content, service artwork, animated headings, custom cursor and R3F scenes remain in place. No dependencies, environment variables, API handlers, database models, authentication, email or booking logic were changed.

## Shared styles

- `app/glass.css` owns the surface tokens, compatibility classes and variants: `glass-soft`, `glass-card`, `glass-panel`, `glass-dark` and `glass-hover`. Card fill is `rgba(89,101,114,.42)`; dark fill is `rgba(48,57,68,.48)`. More opaque panels support forms and overlays. Borders use a 12% white edge with restrained top/bottom highlights; blue accent borders use 28% opacity. Secondary text is `#D1D6DD`; primary text and the main gray/blue colors are preserved.
- `theme/glass.ts` exposes the same CSS tokens to MUI, with solid fallback values. The MUI theme applies them to cards, drawers and dialogs and adds clear field focus styling. Unsupported backdrop filters retain readable solid surfaces. Both standard and WebKit declarations are retained in the production CSS.
- `GlassReflection` provides decorative, noninteractive reflection/lighting layers. `GlassLighting` is one delegated controller shared by public pages and admin. It follows mouse input only on explicitly selected portfolio, review and service panels. It schedules at most one animation frame per input change, has no idle loop, and clears on pointer exit/cancel, clicks, scrolling, visibility changes, preference changes and unmount.

## Applied treatment

- The floating navbar uses 12px blur and a smoky fill that becomes more opaque on scroll. Existing active-page indicators, navigation and compact booking action are retained.
- Home has a large glass content panel over its existing atmosphere. Page banners have soft internal blue reflections. Portfolio heading/filter/grid alignment is retained.
- Managed portfolio cards and approved review cards use the shared glass-card surface. Existing logo/title, disclosure, hover, first-tap, keyboard, focus and navigation behavior is retained. The sliding project disclosure stays semisolid for readability.
- Services keep their existing image/copy layout and artwork. Glass is applied around the copy, leaving images sharp. Contact and booking invitations use glass panels; fields use darker translucent fills and visible focus rings. The Calendly iframe and its internal UI are unchanged.
- The footer retains an opaque dark base with an inner smoky surface and its existing navigation, socials and Admin Login link.
- Admin summary panels use restrained glass. Long forms and data lists use semisolid fills without stacked blur. Sidebar/header styling, existing admin animations and dialogs are retained. Login adds the existing Quiet Logic logo and a subtle one-time reflection.

## Motion and performance

Reflection sweeps use transform/opacity over 320–360ms. Selected cards scale to 1.01; primary/secondary actions scale to 1.03. Existing review lift is retained without multiplying two scale effects. Blur is static and varies by surface, generally 8–16px on desktop and 6px on the main mobile surfaces; drawers use a restrained 10px blur. Touch/coarse pointers disable new mouse-follow lighting and reflection layers. Reduced motion removes the new decorative motion while keeping all content and controls available. No canvas/WebGL instances or image assets were added.

## Verification

Validation commands: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:admin` against disposable MongoDB and local SMTP. The suite covers admin login, recovery/password changes, review moderation/privacy, project uploads/publication/reordering, social management, contact drafts, Calendly, SEO, existing WebGL/service motion, keyboard/touch interactions and layout stability.

Final results: lint, typecheck, production build and whitespace checks passed; the disposable-database suite passed **163 integration assertions and 37 browser tests**. The service-button regression now checks the requested 1.03 scale. Responsive measurements target visible rows so Next.js's temporary hidden streaming copy is not mistaken for a second rendered section.

Glass-specific Chromium checks cover mouse-follow movement/cleanup, live reduced-motion changes, touch behavior, navbar blur, readable input rendering and overflow across public routes, Atlas project detail and admin login at 1440, 768 and 375px. The existing responsive suite also covers widths from 320 to 1440px. Screenshots in `qa/glass/` include desktop/mobile pages and focused service, portfolio, contact, review, footer and admin surfaces. The approved-review image uses the disposable test fixture, and booking fixture captures use a simulated vendor frame. Browser checks use desktop/tablet/mobile emulation rather than physical-device profiling.

No manual configuration or database migration is required. Deploy the normal production build to publish the update.
