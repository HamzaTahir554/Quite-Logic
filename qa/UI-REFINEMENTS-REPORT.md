# Four focused UI refinements

The existing App Router layouts, root providers, MUI themes, CSS/WebGL cube renderers, Home MongoDB query and shared image components were inspected before implementation. No packages, environment variables, database fields or routes were added.

## Shared arrows

Decorative link and CTA arrows now use `components/ui/Arrow.tsx`. Its small SVG is hidden from accessibility APIs so the link label remains the accessible name. Hover and keyboard focus move the arrow 5px horizontally over 220ms. Reduced motion removes the translation and transition. Existing directional controls such as previous/next and ordering buttons retain their functional directions.

The component is used in public/header/footer links, meeting buttons, cards, reviews, social links and applicable Admin actions. The cube's rendered texture uses a straight right arrow too. Legacy diagonal glyphs were removed from public components and the CSS image hint. Layout defaults have zero specificity, allowing existing grids, responsive visibility and compact header rules to keep control. SVGs replace old decorative span wrappers, avoiding compounded diagonal movement.

## Cube

The selected and presented faces initialize to the Quite Logic branded face. The CSS transform and initial WebGL quaternion use its exact level orientation before the first frame. The brand holds for 3.5 seconds after the scene becomes active before scroll-driven selection can take over; existing slow autoplay remains available.

The branded CSS cube remains visible while the optional desktop WebGL module loads and renders its first two frames. The scene then takes over using the same orientation, avoiding a blank loading interval. Its readiness state is included in the browser checks.

One orientation controller serves both renderers. It uses refs and finite animation frames rather than per-frame React state. Horizontal input rotates the vertical axis; vertical input rotates the horizontal axis. Momentum is capped, decays with friction, then softly aligns the face whose normal is most directly forward. Explicit selections cancel residual momentum. Pending frames are canceled on unmount and when the document becomes hidden.

Touch uses an 8px gesture threshold. Only gestures beginning on the actual CSS cube own vertical rotation; its surrounding plane retains normal vertical scrolling. The hint explains that distinction. Reduced motion retains manual interaction and removes inertia/autoplay. The existing CSS fallback remains usable without WebGL, initially displaying the brand.

## Home project media

All Admin-selected Home records use the same card, including Atlas, Pulse, Nexa and future uploads. The slug-specific Home branch and Atlas logo positioning were removed. The Atlas terminal remains on its original detail page. Copy uses shared spacing and reserved heading/description/CTA tracks; project visuals use a common 16:10 frame, centered containment and equal padding. Long titles and descriptions remain bounded.

The current Admin field is explicitly a logo, so it uses `object-fit: contain`. Existing detail artwork stays separate. Next/Image, responsive size metadata, lazy loading, the existing server-generated logo thumbnails and broken-image fallback are retained. The MongoDB Home selection, first-three limit, publication rules, Display order and dynamic links are unchanged.

## Mobile typography

Manrope is loaded locally with its supported 200–800 variable range. At widths up to 768px, central CSS tokens specify hero weight 750, headings 700, project titles 650, body 500, labels 600 and buttons 650. Body/form text is 16px with a 1.6 line height; meaningful small labels are 12px. MUI body typography uses the same tokens. The compact header meeting button retains its existing size and mobile visibility.

Day primary/secondary text uses `#1F2933` and `#4F5B66`; Night retains `#F0F1F8` and `#D1D6DD`. The previous opaque mobile Day background and graph base remain in place. Footer backgrounds remain continuous in both themes. Miniature text painted on the scale-model cube is illustration detail; the adjacent full-size selector and description provide accessible content.

## Verification

New checks cover arrow hover/focus/reduced motion, visible-face selection after combined-axis rotation, real touch drags on both axes, page scrolling beside the cube, and Home frame geometry/typography in both themes at 320, 375, 390, 425, 768, 1024, 1280 and 1440px. Existing WebGL, fallback, autoplay, keyboard, authentication and public-page regressions remain enabled.

Review captures are saved in [ui-refinements](ui-refinements/). Tests use disposable MongoDB and a local SMTP sink; production data and Hostinger deployment are outside this change.

Final validation passed: production build, TypeScript, ESLint, formatting/whitespace checks, **329 integration assertions and 74 browser regression tests**. The final run includes the WebGL loading handoff. Captures include the [mobile Day project](ui-refinements/project-day-375.png), [desktop Night projects](ui-refinements/home-night-1440.png), [mobile branded cube](ui-refinements/cube-day-375.png) and [desktop branded cube](ui-refinements/cube-night-1440.png).
