# Unified footer surface

The full-width footer now uses one opaque `#303944` background. The inner gradient and inset shadow were removed so the gutters, company column, Explore, Expertise, Elsewhere, copyright row and Admin Login share that surface. Text uses `#F0F1F8`, `#C9D0D8` and the existing blue accent `#2F80FE`; the footer borders use white at 8% opacity.

The footer markup, content, spacing, logo, links, responsive grids and Back to Top remain unchanged. The decorative orbit, animated accent line, logo animation, hover movement, viewport pausing and reduced-motion support remain.

The Pause/Play rotation button below the service dice was removed along with its unused state and CSS. Automatic rotation, previous/next controls, service selection, dragging, swiping, hover/focus pausing, hidden-tab pausing and reduced-motion behavior remain.

## Verification

- Passed `npm run lint`, `npm run typecheck` and `npm run build`.
- All five existing service-dice Playwright tests passed against a production server with disposable MongoDB, covering WebGL, keyboard interaction, touch, fallback rendering, automatic rotation and hidden-tab pausing. The existing pause-button test now checks its removal and retained automatic/visibility behavior.
- Chromium footer checks passed at 1440, 1024, 768, 375 and 320px: no horizontal overflow, full-width footer, all four columns and bottom links present, correct text colors and subtle divider, and nine inner surfaces without backgrounds, gradients or shadows.
- Pixel samples across the top and bottom blank areas match `#303944`, including the outer gutters. Motion-enabled checks confirmed the decorative line/orbit remain animated; reduced-motion checks confirmed animation is disabled as before. No page JavaScript errors occurred in the responsive footer checks.

Screenshots and measurements are in [footer-unified](footer-unified/). Footer captures use the About page's shared footer with an empty social-links response matching the reference; the fixed header/cursor are hidden only during cropped captures. Tests used local Chromium desktop/tablet/mobile emulation, not physical devices. Production credentials and SMTP were not used.
