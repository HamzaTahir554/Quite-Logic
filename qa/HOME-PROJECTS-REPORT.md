# Admin-controlled Home projects and mobile Day rendering

Visual follow-up: all selected Home projects now share one card/media frame. The Atlas terminal remains on its detail page. See the [four UI refinements report](UI-REFINEMENTS-REPORT.md) for the current presentation and typography changes.

Home uses the existing MongoDB Project collection. It queries only published records with `showOnHome: true`, sorts by the existing Display order and `_id` for stable ties, and displays at most three. No static list or fallback projects remain in the Home component. When the result is empty or unavailable, the section is omitted. The main Portfolio query remains independent and includes all published projects.

Admin Portfolio now includes a Show on Home Page checkbox, a quick Home ON/OFF button and an actual visibility indicator. Selected drafts and published selections beyond the first three are identified as hidden. Existing Preview, Featured, publishing, uploads and ordering remain available. Display order controls both Home and Portfolio; no redundant home-order field was added.

Home passes only presentation fields to client cards. Short descriptions take precedence, description payloads are bounded, and cards clamp long titles/descriptions. Logo fallbacks, proportional sizing, reveal/hover/artwork motion and the Atlas terminal are retained. Card links come from each database slug. The original curated detail pages remain editorial content as before.

The Home query has a five-second public-read deadline and a four-second MongoDB execution limit. A separate Suspense boundary allows Hero and Services to render independently. React cache deduplicates within a request; the existing dynamic Home route reads fresh data on subsequent visits. Project create/edit/delete/reorder handlers invalidate Home, Portfolio and project-detail paths.

## Existing records

After deploying this code, run `npm run db:seed` once with the intended database configured, or enable Home manually in Admin. The migration matches existing concept slugs or their original `sourceSlug`, including records whose public URL was renamed, and only backfills `showOnHome` when absent. Explicit Admin OFF choices, edited content, status and order are preserved. Missing concepts are inserted through the existing upsert. Re-running is safe and does not duplicate records. A separate disposable-database regression verified renamed URLs, preserved title/order/draft status, explicit OFF and exactly three records after repeated runs. This task did not modify production data or deploy to Hostinger.

## Mobile Day follow-up

A read-only check of `https://quitelogic.net/` confirmed that the deployed stylesheet already includes the previous Night-only graph ambient effect and removes its Day pseudo-element. An outdated version of that particular rule therefore does not by itself explain the reported Pixel 7a stripe.

At phone widths, the root and body now paint one flat, opaque `#E8ECF1` base rather than a document-sized radial gradient. The existing graph canvas paints the same opaque light base before drawing its subtle network. This avoids reliance on transparent canvas/backdrop compositing. The canvas instance, graph clock, node density, Night rendering and reduced-motion behavior remain intact. Clay depth stays on existing cards and controls; Atlas descriptions now receive the same 16px mobile Day typography as other project cards.

Ordinary Chromium and the Pixel touch profile did not reproduce the exact original black stripe. These changes harden that rendering path; they do not establish its physical-device cause. Deployment and verification on the original Pixel 7a remain necessary.

## Validation and captures

The integration helper exercises Admin login, editing/publishing/Home selection for Atlas, Pulse and Nexa; independent Portfolio visibility; ordering; title/logo/category/description changes; the first-three limit; a new project's dynamic slug; unpublishing selected content; and the empty selection. It checks responsive Home cards at 375, 412, 768, 1024 and 1440px, and captures the 412px Pixel touch profile at 2.625 device scale with normal motion enabled.

Mobile Day regression checks cover 320, 375, 390, 412 and 425px across public/auth routes, with authenticated Admin coverage in the integration runner. They inspect opaque canvas pixels, the flat page background, no horizontal overflow, readable text, click access and Day/Night persistence. Existing graph lifecycle, accessibility, animation, email, password and database tests remain in the full regression suite.

The touch banner assertion targets the accessible heading because streaming can briefly retain a hidden duplicate. QA captures wait for actual finite reveal animations to finish, and for Admin data to load, rather than recording intermediate animation frames or skeletons.

Captures: [Admin controls](home-projects/admin-controls.png), [Pixel Day Home](home-projects/pixel-day.png).

Final checks passed: production build, TypeScript, ESLint, formatting and whitespace; **329 integration assertions and 70 browser regression tests** using disposable MongoDB and local SMTP. The additional migration regression for renamed URLs also passed. No production deployment or physical-device verification was performed.
