# Home media and Fabric buttons

The Home showcase now uses `ProjectMedia`, independent of the animated artwork component used by curated detail pages. An absolute frame fills the media column; a centered slot is bounded to 78%, 560×460px, with at least 24px clearance. Images retain their intrinsic dimensions with automatic width/height and maximum bounds. Logos and illustrations use contain; screenshots explicitly opt into cover. Artwork does not inherit the old floating wrappers or image zoom. The card keeps its existing reflection and pointer tilt.

Desktop columns remain equal in width and height. At 900px and below, content stacks above a 16:10 media panel. Day uses the existing clay surface token; Night uses an opaque dark media plane to quiet the graph. The content column uses natural text rows and a flexible space before its existing text CTA.

Admin Portfolio adds **Home image presentation** with Logo, Illustration and Screenshot choices. `mediaType` is validated by the existing create/edit API, stored with a logo default, and included in the Home DTO. Existing records without this field render as logos. Partial edits preserve omitted presentation values; no data migration or production database changes are required. The original image endpoint is used for Home so a 480px thumbnail is not enlarged into the larger showcase.

`FabricButton` supports navigation links and native buttons, with primary, secondary and ghost variants. The existing `MagneticLink` wrapper delegates to it, and meeting, contact, review, portfolio loading/retry and error/redirect CTAs use the same component. Text links retain their existing size and receive a small scale/underline accent plus the shared straight arrow.

Fabric motion uses a 240ms transform transition: hover scales 1.025×1.01, press scales .985×.96. A low-opacity pseudo-element supplies the reflection; text moves 1px and the arrow 5px horizontally. Keyboard focus has a visible outline; disabled controls remain disabled. Reduced motion removes stretch, translation and transitions while retaining focus and state cues. Existing Day/Night colors and compact header visibility remain under the existing theme rules.

## Verification

`scripts/test-project-media.ts` runs inside `test:admin` using disposable MongoDB and authenticated uploads. It verifies tall 800×1000, wide 1200×400 and small 80×60 raster assets at 320, 375, 390, 425, 768, 1024, 1280, 1440 and 1920px in both themes: image center, equal desktop column heights, intrinsic aspect ratio, minimum clearance, maximum size, no upscaling, contain behavior and no horizontal overflow. It also checks persisted screenshot cover, omitted-field edits, invalid-type rejection and the Admin editor's saved selection.

The tall test project uses the screenshot's **AI Voice Doctor Appointment System** title with a deliberately bordered geometry fixture. The original uploaded doctor artwork was not available in local project assets. Captures named `doctor-*` demonstrate the same reusable bounds with this test fixture; they do not claim to reproduce the production artwork. `projects-*` captures show the three existing seeded projects with their actual SVG assets.

`tests/fabric.spec.ts` checks both-theme hover/press/release, stable sibling layout, sharp text, keyboard focus, reduced motion, all public CTA semantics, mobile touch targets, contact submit semantics and the meeting dialog. The existing responsive Home tests cover Atlas, Pulse and Nexa at all requested widths. Existing theme and service interaction expectations now use the Fabric transform values.

Preview captures: [desktop Day](media-fabric/projects-day-1440.png), [desktop Night](media-fabric/projects-night-1440.png), [mobile Day](media-fabric/projects-day-390.png), [mobile Night](media-fabric/projects-night-390.png).

Final validation passed: production build, ESLint, TypeScript, formatting and whitespace; **348 integration assertions and 77 browser tests** in the complete disposable MongoDB/local SMTP run. Responsive upload checks covered both themes at 320–1920px. No production deployment or physical-device verification was performed. Earlier QA artifacts were preserved; this task's captures live in `qa/media-fabric/`.
