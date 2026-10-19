# Day / Night visual themes

Day uses warm-gray clay surfaces, inset form controls, tactile buttons and dark text. Night retains the existing smoky glass surfaces, reflections and blue accents. Public navigation and both admin headers share the same accessible theme toggle. On small screens the header booking action moves into the navigation drawer; page booking actions remain available.

## Implementation

- `theme/tokens.ts`: palette definitions, graph colors and the early bootstrap script.
- `theme/VisualThemeProvider.tsx`: central theme state, system preference handling and cross-tab synchronization.
- `theme/theme.ts`: both MUI themes, selected through the existing application provider.
- `app/themes.css`: document-wide tokens and clay overrides for public pages, forms, admin data surfaces, footer and booking shell.
- `components/ui/ThemeToggle.tsx`: keyboard-accessible Day / Night pill.

The preference is saved as `quietlogic-theme` (`day` or `night`). Without a saved preference, the site follows the operating system, including live changes. Blocked browser storage does not prevent switching. The bootstrap runs in the document head before hydration, with CSS controlling initial colors. Reduced-motion users receive immediate theme changes instead of animated transitions.

The graph renderer changes its palette without recreating its canvas, resetting connections or adding pointer interaction. The service cube updates its material and face textures without changing selection or interaction behavior. The footer remains one continuous surface in either mode.

Calendly receives its supported background and text color options when opened. A theme change while booking preserves the existing iframe and appointment selection; the embedded calendar uses the new palette the next time it opens. The surrounding modal changes immediately.

Reduced-motion hydration mismatches in project artwork, the philosophy story and the process track were corrected using the existing hydration-safe motion preference hook.

## Validation

- Production build and TypeScript compilation pass.
- Targeted ESLint checks pass.
- All 21 production browser/unit checks pass across theme, booking, glass, graph behavior and graph cleanup suites.
- Browser coverage includes preference restoration before hydration, OS changes, blocked storage, keyboard switching, client navigation, refresh, form values and graph canvas identity.
- Day layouts are checked at 375, 768 and 1440 pixels across public routes and admin authentication pages, including heading contrast, footer consistency and horizontal overflow.
- Admin table, status and form presentation is checked with an isolated browser fixture; authenticated database management is not exercised by the theme tests.
- Booking uses a deterministic third-party fixture; no real meeting or email is sent.

Visual regression checks run against a local production server with database access disabled only in that process, so they do not depend on external database availability. Saved environment files and backend integrations are unchanged by this theme work.
