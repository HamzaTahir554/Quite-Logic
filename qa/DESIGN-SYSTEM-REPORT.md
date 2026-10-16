# Smoky gray design system and signature service cube

The existing Next.js site now uses the requested medium gray identity throughout. Page backgrounds use `#4B5560`, alternate surfaces and the footer use `#303944`, and cards/forms use `#596572`. Primary text remains `#F0F1F8`; `#2F80FE` is reserved for brand and interaction accents. Muted text is a readable off-white. CSS tokens and the MUI theme agree; prior almost-black palette overrides were removed.

The five homepage cards and five separate service-page blocks have been replaced by one shared six-faced cube. Faces represent Web, Apps, AI Automation, AI Vision, Custom Software, and Quite Logic / Explore All. Each carries an icon, number, title, description, and arrow. The adjacent description stages its icon, heading, copy, and action after the requested face settles.

Desktop rendering uses React Three Fiber with a low-complexity rounded body, six locally generated textures, a thin native blue edge outline, and a CSS depth shadow. Unlit materials preserve palette colors and avoid unnecessary lighting calculations; DPR is capped at 1.25, with no WebGL shadows. Antialiasing keeps the desktop outline smooth; mobile uses CSS instead of this renderer. A quaternion interpolates to the selected face; no React state is updated per animation frame. Interactions include scroll selection through the five disciplines, deliberate 8.2-second autoplay steps, pointer response, hover feedback, raycast face selection, horizontal drag, and accessible selection/previous/next buttons. Autoplay yields to hover, focus, gestures, and recent manual selection; an explicit pause/play control is provided.

Tablet/mobile retain the six-sided concept with CSS 3D, horizontal swipes, and native vertical scrolling. They do not load the service WebGL renderer. Reduced motion keeps content and controls visible with immediate face selection, without WebGL, autoplay, or tilt. Devices without WebGL, with data saving enabled, or reporting limited CPU/memory use the CSS experience. WebGL render failures/context loss also fall back to CSS.

Existing distinct page-banner sequences, masked/parallax artwork, magnetic buttons, route transitions, portfolio filtering and depth effects, and the Atlas deployment sequence remain integrated with the revised palette. Navigation has a load entrance and scroll-aware presentation. The slate footer has a revealed logo/links, a moving blue line, a slow background outline, and link feedback. Expensive scene motion and service autoplay pause outside the nearby viewport and in inactive tabs. Decorative CSS motion is paused by visibility scopes and tab visibility. Cleanup covers observers, listeners, timers, animation instances, textures, geometry, and GSAP contexts.

## Verification

- `npm.cmd run typecheck` and the optimized production build pass.
- The 19-test Chromium suite covers the six cube faces, actual raycast clicks, keyboard selection, drag, gesture cancellation, scroll selection, autoplay pause/resume, simulated tab visibility, actual CDP touch swipes, native vertical touch scrolling, reduced motion, and unsupported WebGL.
- Existing navigation/client scene lifecycle, home hero, branding, Atlas details/redirects/terminal, portfolio filtering, contact states, SEO/404, and page-banner tests pass.
- Six core routes are checked at 320, 375, 425, 768, 1024, 1280, and 1440px for visible headings, metadata, and horizontal overflow. Browser error assertions include hydration/runtime errors; the WebGL interaction test also checks console errors.
- The optional autoplay control renders after hydration to keep server HTML consistent with reduced-motion clients.
- Representative motion-enabled desktop, tablet, and mobile captures have been visually reviewed. The full route screenshot set is refreshed by the browser suite.

Screenshots: [desktop cube](screenshots/service-cube-desktop.png), [mobile cube](screenshots/service-cube-mobile.png), [home](screenshots/smoky-home-motion.png), [footer](screenshots/smoky-footer.png). The generated [local metrics](design-metrics.json) record initial home CLS, a short service-scene requestAnimationFrame sample, computed palette values, and captured errors.

The recorded run measured zero initial home CLS. Active scene frame timings and the SwiftShader software WebGL backend are recorded in the metrics JSON. The renderer was simplified to unlit materials and native lines after the first measurement. A paused-scene diagnostic returned approximately 60 callbacks per second. The desktop 60 FPS target is not verified here; hardware-accelerated desktop and physical mobile validation remain necessary. The final JSON preserves the observed result rather than asserting a universal frame rate.

Browser coverage uses emulated mobile/tablet viewports and actual dispatched touch input, rather than a physical-device lab. Tab visibility is explicitly simulated. Lifecycle cleanup is reviewed and route transitions are exercised, but this is not a long-running memory-leak soak test. Real email delivery still requires the documented provider configuration and smoke test.
