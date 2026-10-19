# Shared technical graph background

The existing application now has one persistent Canvas 2D graph beneath all public and admin content. It uses connected nodes, restrained blue accents, slow drift, large open arcs, occasional pulses and fading data signals. Graph geometry is deterministic and survives client navigation; individual sections do not mount their own networks.

## Architecture and layering

- `components/background/GraphBackground.tsx` mounts once in the existing root providers. It selects public, authentication or admin intensity from the route without remounting the renderer. An explicit `variant` prop is also supported.
- `graph-renderer.ts` owns autonomous drawing, visibility, media preferences, context recovery and cleanup. It registers no mouse, pointer, hover or scroll handlers. No React state updates occur per frame.
- `graph-geometry.ts` builds a jittered lattice and a bounded pool of nearby candidate pairs during resize. It reserves distance for node drift so connections stay local throughout their lifetime.
- `graph-connections.ts` schedules staggered connection lifecycles over that pool. Every node has at most three active or fading connections. Candidate selection runs in small batches every 0.35–0.7 animation seconds rather than recalculating every possible pair each frame. Recently disconnected partners receive a cooldown and lower selection priority.
- `app/graph-background.css` places the fixed canvas at z-index 0 above the existing body base. A static ambient gradient sits above the graph, and existing content at z-index 1 and higher remains above it. The entire decorative layer has `pointer-events: none` and `aria-hidden="true"`.

The previous global ambient layer and hero-only WebGL network have been replaced by the shared canvas. The service dice retains its existing R3F/WebGL implementation. Hero ornaments, page transitions, text animations, card interactions, glass lighting, cursor effects, navigation and admin animations remain. The hero background plane is translucent so it can reveal the shared graph. The admin workspace retains its original base color through the body and a transparent ambient overlay; its sidebar, navigation chrome and dense form/list surfaces keep their existing contrast.

The footer remains one opaque `#303944` surface with its existing decorative line and orbit. The graph never paints over it. Page structures, content, routes, MongoDB models, authentication, portfolio/review/social management, SMTP, contact submission, Calendly and SEO are preserved. No packages or environment variables were added.

## Motion and performance controls

| Mode                        |                   Nodes |    Target draw rate |         DPR cap |   Intensity |
| --------------------------- | ----------------------: | ------------------: | --------------: | ----------: |
| Mobile, up to 600px         |                      22 |              30 FPS |               1 | Public 100% |
| Tablet, up to 1000px        |                      34 | 60 FPS, 30 on touch | 1.5, 1 on touch | Public 100% |
| Desktop, up to 1600px       |                      56 |              60 FPS |             1.5 | Public 100% |
| Large desktop               |                      76 |              60 FPS |             1.5 | Public 100% |
| Admin workspace             | Same responsive density |     Same device cap | Same device cap |         50% |
| Login and password recovery | Same responsive density |     Same device cap | Same device cap |         85% |

Nodes drift 2–8px on randomized 8–20 second periods. Connections smoothly draw and fade in over 0.8–1.5 seconds, hold for 2–6 seconds, then fade out over 0.8–1.5 seconds before nearby partners rotate. Mixed initial ages and independently staggered timing prevent an empty startup or a synchronized restart. Occasional blue signals travel only during the fully connected phase, with at most three simultaneous signals on desktop and one on compact/touch devices. Mobile animation time advances more slowly. Gentle arc movement and depth run on the internal clock; no movement depends on cursor coordinates, hover or scrolling. The separate website cursor and card lighting remain unchanged. No blur filters are animated.

Hidden tabs stop animation frames; elapsed animation time does not jump on return. Reduced-motion mode keeps a static visible graph without a continuous loop. Resize/media changes can redraw that still image. Disposal cancels animation and resize frames, disconnects ResizeObserver, removes all resize/media/context/visibility listeners and releases the bitmap buffer. Unsupported Canvas 2D leaves the normal page usable without decoration.

Under sustained compositor/page load (eight slow frame deliveries), the renderer skips alternate background paints. It automatically restores the normal budget when frame delivery recovers. This does not throttle navigation, input, scrolling, or existing UI animations. A controlled lifecycle check verifies both degradation and recovery.

## Validation coverage

The autonomous-loop update passed `npm run lint`, TypeScript checking (`tsc --noEmit`), `npm run build`, **290 integration assertions** and all eight graph tests. The full browser run passed **46 of 47 tests**; the existing glass-card hover test timed out on its first hover assertion, then passed **three isolated reruns** unchanged. Its trace showed scrolling around the hover; this appears to be an existing scroll/hover timing race. The aggregate `test:admin` command therefore exited with a failure on that initial run. No application cursor or glass-lighting code was changed to accommodate it. The drawing probe recorded 22 samples at a 1920×1080 viewport: **0.27 ms mean / 0.50 ms p95** synchronous canvas drawing time.

Responsive graph checks cover Home, Services, About, Work, Portfolio, Atlas project detail, Contact, Reviews, Admin Login, Forgot Password and Reset Password at 1920, 1366, 768 and 375px. Authenticated checks cover Dashboard, Reviews, Portfolio, Settings and Account at those same sizes. The existing application has no Clients or Inbox routes; future screens under the shared layout inherit the graph automatically.

Tests check one graph canvas, nonempty drawing, full viewport bounds, density/connection limits, no overflow, preserved footer background, client-navigation continuity, input/link interaction, public/admin intensity, DPR limits, touch behavior, live reduced-motion changes, hidden-tab suspension and Canvas 2D failure. The browser motion probe verifies canvas changes without moving the cursor. A 120-second simulated lifecycle at four viewport widths verifies continuously changing partners, local distances throughout drift, smooth connection endpoints, no global restart, the three-connection cap and signal limits. A renderer lifecycle test verifies no graph input handlers and that disposal leaves no pending frames, observers or registered listeners, including a queued resize.

The synchronous drawing probe measures from canvas clearing through the outer canvas-state restore. It excludes unrelated work queued after the drawing function. Measurements are recorded in `qa/graph/render-metrics.json`; they describe canvas CPU draw cost in local Chromium, not complete page FPS or physical-device GPU performance. The 60/30 FPS settings are targets. The full page did not reach 60 FPS in this headless environment even with the graph frozen; comparison with existing CSS animations paused identified an existing compositing cost. The graph therefore yields paints under load. Physical-device GPU/frame-rate verification remains a limit of this QA. Screenshots use browser viewport/touch emulation; admin captures use disposable test data and wait for loading indicators to clear.

Screenshots are in [graph](graph/). The full regression runner uses disposable MongoDB and a local SMTP sink, never production database or SMTP credentials. Existing auth, email, moderation, upload/publication, social links, Calendly, keyboard/touch behavior, SEO and layout checks run alongside the graph tests.
