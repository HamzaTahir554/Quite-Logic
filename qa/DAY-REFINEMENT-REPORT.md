# Day-mode clay refinement

The existing Day theme now uses the requested background (`#E8ECF1`), base (`#E5E9EE`), raised (`#EDF0F4`) and secondary (`#DFE4EA`) surfaces. Headings use `#18222D`, body text `#465463`, metadata `#687583`, and brand accents `#2F80FE`.

Day-specific CSS tokens in `app/themes.css` provide balanced raised shadows, inset controls, compact shadows on mobile, blue focus rings and explicit pressed states. MUI and canvas palettes are synchronized in `theme/tokens.ts`. Night palette values are unchanged.

Updated public and admin surfaces include service panels, project cards, reviews, navigation, forms, search/filter controls, status chips and the continuous footer plane. Important text has opaque colors. Primary actions use blue with white text; disabled contact actions have readable dark text on a neutral surface. Native admin focus borders and MUI input focus rings retain inset depth.

The autonomous graph has quieter Day lines and nodes, with the requested blue active connections. Its geometry, timing and lifecycle are unchanged. Calendly's Day URL colors follow the shared palette; booking behavior is unchanged.

Validation:

- Production build and targeted ESLint pass.
- All seven theme tests pass after final fixes, covering persistence, initial rendering, mobile/tablet/desktop layouts, keyboard access, form values, focus/pressed/hover states, footer consistency, admin presentation and booking preservation.
- Fifteen existing booking, glass and graph regression checks passed during the update.
- Screenshots are in `qa/day-refinement/`.

Visual checks use a separate local production server with database access disabled only in that process. Authenticated dashboard data operations and live email delivery are outside this styling check; saved environment settings and backend logic were not changed. Admin data surfaces are verified using an isolated browser presentation fixture.
