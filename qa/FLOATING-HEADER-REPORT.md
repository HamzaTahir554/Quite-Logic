# Floating public header

The existing shared `Header` was refined in place. It retains the original logo, six navigation destinations, Day/Night toggle, Fabric booking button and MUI mobile drawer. No dependencies, routes, database fields, environment variables or application APIs were added.

## Position and surfaces

`app/header.css` owns the public header treatment after the existing theme and Fabric styles. The header is centered at the global 1180px container limit, 20px from the top on desktop. Tablet uses the existing content margins; phones use 16px side margins and a 14px top inset plus the device safe area. Day uses an opaque #E4E7EB clay surface. Night uses a translucent #303944 surface with a static 16px backdrop blur. Text and controls sit outside the filtered surface.

The initial entrance runs once for 420ms with a small upward offset and restrained settling. The logo has a 1.02 hover scale and a slightly brighter blue accent. The active route uses one shared blue dot, including the Portfolio indicator on individual project pages. Desktop and mobile indicators have separate motion identities. Reduced motion removes the entrance, hover displacement and spring transitions.

## Scroll behavior

`useHeaderScroll` queues at most one animation frame per scroll burst. React updates only when the compact or direction state changes. The header compacts at 104px and expands again below 64px, providing hysteresis around the threshold. A 32px downward run or 18px upward run determines direction after the page has moved sufficiently. Tiny reversals do not make the bar jitter.

Desktop height changes from 76px to 64px; tablet/phone height changes from 68px to 60px. The fixed shell changes its footprint without affecting document flow. Its surface scales vertically and the content row translates into place over 260ms, rather than animating layout dimensions or blur. Logo and booking controls become slightly smaller. Downward travel lifts the bar only 4px on desktop or 2px on mobile; upward travel restores it. The header stays visible throughout. Menu, modal and keyboard-focus interaction pause scroll state changes. The listener and queued frame are removed on unmount.

## Navigation and spacing

The original MUI drawer now opens beneath the floating bar with a 280ms entrance, short link staggering and matching clay/glass surfaces. It retains MUI focus trapping, Escape/backdrop dismissal and focus restoration. The hamburger exposes its expanded state and controls the named navigation dialog. The panel scrolls on short screens, keeping all six links, booking and close controls reachable. Resizing to desktop closes it. The existing booking dialog continues to open above the navigation panel and returns focus to it on dismissal.

Public layout CSS reserves a fixed amount of top space before page content. Shared Home and PageHero padding account for that reservation, so each route does not need a separate margin patch. Admin layouts receive no public spacing. The graph remains behind public content and the header; navigation and booking modals keep their existing higher MUI layers.

The older Portfolio intro margin and project breadcrumb padding no longer add a second header allowance. The Atlas pointer test now targets the actual interactive stage bounds instead of a fixed viewport coordinate, so it continues to exercise the terminal interaction as shared chrome spacing changes.

## Verification

The new browser tests cover Home, Services, About, Work, Portfolio, an individual project, Contact and Reviews at 320, 375, 390, 425, 768, 1024, 1280, 1440 and 1920px in both themes. They check safe insets, control alignment, heading clearance, compact CTA dimensions, overflow and hydration errors; scroll hysteresis and unchanged document layout; nested-route indicators and stable theme-switch dimensions; menu positioning, focus, booking layers, Escape and route changes; reduced motion; resize behavior; and a 320×568px touch viewport with a scrolling menu.

The existing glass test now checks the separate header surface's static blur rather than the unfiltered control container. The focused header, glass and hero checks passed before the full regression run.

The responsive Home test now waits for hydration and visible streamed cards before measuring their frames, and sets the saved theme once per theme pass instead of registering conflicting initialization scripts. Its assertions and responsive coverage remain intact.

Previews: [desktop Night](floating-header/night-1440.png), [desktop Day](floating-header/day-1440.png), [mobile Day](floating-header/day-390.png), [mobile menu Day](floating-header/menu-day-390.png), [tablet menu Night](floating-header/menu-night-768.png).
