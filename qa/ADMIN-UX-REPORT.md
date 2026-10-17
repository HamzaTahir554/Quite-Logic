# Admin and portfolio UX update

Scope follows the requested UX additions, focused on Dashboard, Reviews, Portfolio and Account as confirmed in chat. Clients and Inbox were not added. Existing authentication, MongoDB access checks, password recovery, contact email drafts, Calendly, editorial case studies, public branding and unrelated animations are retained.

## Admin experience

- Fixed desktop sidebar with icons, clearly marked active section, account top bar, website link and skip link. At 900px and below the sidebar becomes an accessible MUI drawer with Escape handling, focus containment and focus restoration.
- Dashboard shows total, published and draft projects plus pending and approved reviews. Summary cards open the corresponding filtered lists. Quick actions open a new project form or pending reviews directly. There are no charts or fabricated message statistics.
- Shared confirmation dialogs replace browser confirm boxes. Delete actions explain their permanence; review rejection explains that it can be reversed; logout asks for confirmation.
- Shared success/error toasts, persistent inline errors, request timeouts, disabled processing controls and duplicate-submission guards provide feedback. List refreshes preserve existing rows; first-load skeletons, retry controls and contextual empty states cover other states.
- Unsaved projects are protected by confirmation on Cancel, switching projects and ordinary link navigation. Browser reload/close uses the native unsaved-change prompt. Browser history navigation can still bypass the link guard; save before using Back/Forward.

## Project management

- List rows show a logo with safe fallback, title, category, publication status, updated date, order and clear actions. Search/status filters, newest/oldest sorting, pagination and move controls remain server-backed.
- Required fields are marked and validated inline. Image type/size guidance, upload progress, preview and failure feedback preserve existing entered data. Descriptions have character counts. Technologies use comma-separated names, and page addresses are generated automatically with an optional advanced field.
- Save Draft and Publish Project make publication intent explicit. Saving from an input with Enter preserves an existing published project's status. List actions are disabled while editing to prevent conflicting changes.
- Both saved and unsaved projects have a private preview dialog. Its card reuses the public component, and its details tab shows the complete description and technologies. Preview never publishes or exposes a draft URL. Tabs support arrow keys, Home and End.
- New uploads include a pre-generated 480×320-bounded WebP thumbnail. Card/list previews request it using `?size=card`; original uploads still work through the fallback for older image records. Publication/auth checks occur before either image variant is returned. No external storage or migration is needed.

## Reviews and account

- Reviews show name, company, star rating, date, status and a short excerpt. View Full Review opens a dialog with the full text, role, service, private email, date and moderation actions.
- Approving shows a specific success message. Rejecting and deleting require confirmation; errors preserve the current record and allow retry.
- Account has a profile summary and clear password-change form. Login/recovery/password forms now add inline validation and friendly request errors while preserving the existing server checks and session revocation.

## Public portfolio

- Default cards keep the logo and title prominent. Hover/focus reveals a sharp description panel using 250–300ms transform/opacity transitions. Logo/title movement is small; reduced motion is respected. The CTA stays visible while long descriptions scroll within the panel.
- Mouse clicks on the card identity open the real detail page. Keyboard focus reveals details, Space reveals them and Enter opens the detail page. Touch devices show a visible View details affordance: first tap reveals the content, then the separate View Project CTA navigates.
- All published MongoDB projects already have an automatic detail page, so card links consistently use that page; the project's external URL is offered from the detail page. Existing curated concept pages keep their original presentation. Concepts remain labelled in the revealed panel.
- Category filtering queries all published records rather than only the initially loaded page. Legacy multi-discipline concepts keep their existing category mapping. Queries escape category input, paginate and omit drafts. Filter switches cancel stale requests, cache previously viewed results, and animate without full-page reloads.
- Server-rendered heading/content and a Suspense skeleton keep loading understandable. Empty published lists say “New projects are coming soon.” Failed images use a branded initial instead of a broken icon. Generic project details now include a clear back link, logo fallback, overview and technology chips.

## Files

New reusable components: `components/admin/AdminFeedback.tsx`, `AdminElements.tsx`, `AdminIcon.tsx`, `ProjectEditor.tsx`, `ProjectPreview.tsx`, `project-types.ts`; `components/projects/PortfolioCard.tsx`, `ProjectLogo.tsx`, `PortfolioSkeleton.tsx`; `app/admin/(protected)/loading.tsx`; `lib/project-filters.ts`.

Updated: admin layouts/pages/CSS/navigation/forms/list managers; `components/sections/Portfolio.tsx`; portfolio page/detail/CSS; public project query/API and admin project sorting; image model/storage/API; API field validation responses; integration runner and affected browser tests. No new packages or production secrets are required.

## Validation

- `npm run build`, `npm run lint`, `npm run typecheck` and `git diff --check` passed.
- `npm run test:admin` passed: 111 assertions, including the browser-suite completion check, plus all 30 Playwright regression tests. The runner uses disposable MongoDB and a local SMTP sink; production data is not used.
- The browser workflow exercised login, project validation/upload, private preview, save draft, publish, edit, unsaved-change protection, unpublish and confirmed deletion. It also exercised review submission, full details, approval, public updates, rejection and deletion. API integration checks covered password recovery, reset, login and password changes, session revocation, access checks and image privacy.
- Failure-path checks covered retained form data after a failed save, duplicate-submit prevention, loading skeletons, failed requests with retry, invalid uploads and missing-image fallbacks. Category filtering was verified beyond the first page of published results.
- Responsive browser checks covered admin widths of 375, 768, 1024 and 1440px, including the mobile drawer and focus restoration. Public cards were checked with mouse, keyboard and real touch-enabled browser contexts at phone and tablet widths, with reduced-motion and existing site regressions also passing.
- Final screenshots were visually reviewed for the mobile editor, desktop project list and expanded mobile public card. Screenshots under `qa/admin-ux/` also include dashboards, drawers, review details and public grids.

No new packages or environment variables were introduced. Restart an already-running development server to load the updated Mongoose image schema before testing new thumbnails.
