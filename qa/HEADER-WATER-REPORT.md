# Floating water header

The public header retains its autonomous water surface and now navigates directly through ordinary Next Links. The page-change spill has been removed completely.

## Preserved surface

`WaterSurface` retains two translucent SVG waves and a light reflection inside the existing glass/clay surface. Its decorative wrapper floats by ±2px over 6.8 seconds; mobile uses ±1px over 8 seconds and omits the reflection. Wave cycles remain 12/8.6/15 seconds on desktop and 14/10 seconds on mobile. The layers move without pointer input and persist across public route changes.

The controls remain outside the decorative wrapper, keeping their text and hit targets steady. Day retains its light clay base; Night retains smoky glass with subtle blue and white highlights. Scroll compaction, the logo, theme toggle, Fabric meeting button, mobile menu and booking behavior are preserved. Reduced motion freezes the decorative animations; the existing hidden-tab signal pauses them when the page is hidden.

## Immediate navigation

Header links no longer cancel navigation, schedule a route push, or wait for animation. The navigation handler only closes the mobile menu. The active navigation dot moves over 240ms, or immediately with reduced motion. The header keeps the same decorative elements and running animation timelines when a route changes.

Header links bypass the existing full-screen studio curtain. The site's lightweight content reveal remains available, and other page links retain their existing transition. No header layer expands outside the pill or covers page content.

Removed: `HeaderSpillTransition`, `useHeaderSpill`, their SVG sheet and gradients, all spill CSS, navigation-phase attributes/state, delayed route timers, animation callbacks and spill-specific history listeners. The shared studio transition no longer tracks a header spill destination. Outdated spill previews were also removed.

## Verification

Browser checks cover the requested Home → Services → About → Work → Portfolio → Contact → Home sequence in both themes, persistent floating waves, stable controls, absence of spill/curtain overlays during header navigation, active route indicators, mobile menus and booking, keyboard/native links, and reduced motion.

The existing responsive header suite covers 320, 375, 390, 425, 768, 1024, 1280, 1440 and 1920px. Tests use a production Next.js build, Chromium, and a seeded disposable local MongoDB instance; existing QA artifacts are preserved. This uses browser viewport/touch emulation, not a physical phone.
