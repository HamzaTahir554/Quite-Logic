# Quite Logic

Next.js App Router website built with TypeScript, MUI, React Three Fiber, Three.js, Drei, Framer Motion, and GSAP. The supplied `Demo/` and `snapshots/` references are preserved.

## Development

Requires Node.js 24 and npm.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open http://localhost:3000. On Windows, `npm.cmd` avoids the PowerShell script execution policy restriction.

## Production

```powershell
npm.cmd run build
npm.cmd start
```

Use a host supporting Next.js 16 with Node.js 24, such as Vercel or a Node server. This application includes a server-side contact endpoint and dynamic social images. It is not a static-only export. The first build needs network access to download Manrope through `next/font`; the generated site self-hosts the font.

Before public launch:

- Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain before building. It powers canonical URLs, structured data, social metadata, and the sitemap. Development falls back to localhost.
- Configure hosted `DATABASE_URL` and `GMAIL_APP_PASSWORD`, run the migration, and create your admin using [ADMIN-SETUP.md](./ADMIN-SETUP.md).
- Shared PostgreSQL rate limits apply across serverless instances. Endpoints also validate origin, content, payload size, and honeypots. Contact limits are five inquiries per sender and 60 total per 15 minutes; reviews and login have separate limits.
- Replace the explicitly labeled illustrative portfolio concepts with authorized client work when available. No customer results or testimonials are fabricated.
- Replace the visibly marked social placeholders with real company profile links.
- Review the privacy information needed for your business before collecting inquiries publicly.

Contact inquiries are stored in PostgreSQL and notifications go to `company.quitelogic@gmail.com`. Gmail SMTP is the primary sender; existing `RESEND_API_KEY` and a verified `CONTACT_FROM_EMAIL` remain an optional notification fallback when Gmail is not configured. Notification failure does not discard a stored inquiry. Admin email always sends from the official Gmail account. Missing database configuration returns an honest unavailable state; failed forms preserve entered values. Live delivery requires private credentials and a separate delivery test.

“Book a Meeting” opens the official [Calendly page](https://calendly.com/company-quitelogic/30min) in an accessible modal from the header, contact page, and final CTAs. The iframe loads only when requested, with a direct-link fallback, fixed dimensions, close control, Escape dismissal, and focus restoration. Color parameters follow [Calendly’s documentation](https://calendly.com/help/how-to-customize-your-embed); Calendly controls embedded content and color customization may depend on its plan. No test bookings are created.

## Architecture

- `app/`: homepage, services, about, work/process, portfolio, contact, concept detail pages, SEO endpoints, and branded loading/error/404 states.
- `components/`: shared navigation, footer, page sections, UI, SEO, and dynamically loaded hero scene.
- `data/content.ts`: editable navigation, services, project concepts, and process copy.
- `theme/theme.ts` and `app/globals.css`: brand tokens, MUI customization, layout, motion, and responsive design.
- `lib/contact.ts`: shared form schema and options.
- `app/api/contact/route.ts`: persistent inquiry storage and Gmail/Resend notifications.
- `app/admin/`, `app/api/admin/`, `database/`: authenticated review moderation, client records, and email history.
- `public/logo/`: original supplied branding; `public/projects/`: local concept artwork.

The shared design system uses Smoky Gray `#4B5560` for the page, Slate `#303944` for contrast, Card Gray `#596572` for surfaces, Blue `#2F80FE` for accents, and Off White `#F0F1F8` for primary text. The shared brand component gives Quite and Logic their distinct colors.

The homepage retains its six-faced service cube: Web, Apps, AI Automation, AI Vision, Custom Software, and Explore All. Desktop uses a lazy-loaded React Three Fiber scene with generated local textures, capped DPR, quaternion snapping, scroll selection, raycast face selection, drag, hover, and deliberate autoplay. Tablet/mobile use a lightweight CSS cube with horizontal touch swipes and native vertical scrolling. Accessible buttons and previous/next controls work in both renderers. Reduced motion disables autoplay, WebGL, pointer tilt, and transition animation without hiding service content. Unsupported WebGL and limited device capabilities retain the CSS experience. MUI Drawer provides mobile focus management and Escape dismissal.

`components/motion/` contains sharp scale CTAs, the dot-and-ring cursor, progress/navigation effects, crystal reflections and page-banner treatments. Desktop banner text uses bounded, interpolated translation/rotation; touch and reduced-motion users retain still text. The Services page uses five alternating image/text editorials, matched by filename from `services images/` to `public/services/`, with reserved image space, mask reveals and bounded desktop image movement. Its old cube mount, sculpture markup, scroll controller and unused styles are removed. Three.js/R3F dependencies remain in use on the homepage. How We Work and Philosophy are removed only from Home; their other pages remain intact. Scene rendering and service autoplay pause outside the nearby viewport and in inactive tabs. Continuous decorative motion is scoped to visible sections and pauses in inactive tabs. Animation instances, textures, geometry, listeners, observers, timers, and GSAP contexts have cleanup paths. `app/studio.css` and `app/interaction.css` style the shared pages and interactions; `app/hero.css` implements the centered home hero and branding. `app/atlas-motion.css` styles project visuals, banners, and the Atlas showcase using shared gray tokens. `app/service-cube.css` styles the signature cube, lighter panels, and animated slate footer. Scrolling remains native.

The cube follows the mouse on desktop, including its CSS fallback. Mobile uses passive face rotation, horizontal swipes, and buttons. The site does not access physical motion sensors or request motion permissions. Live reduced-motion preferences stop scene animation and autoplay without a reload.

See [the design system report](qa/DESIGN-SYSTEM-REPORT.md) for the underlying visuals. Capture the signature interaction with `node qa/capture-cube.mjs`; run `node qa/audit-design.mjs` for a short desktop frame/CLS sample. These default to port 3100 and accept `E2E_BASE_URL`. Atlas / Cloud retains its shared illustrative terminal showcase on the homepage, portfolio, and `/portfolio/atlas-cloud` detail page. The previous project URL permanently redirects to the replacement. The earlier [Atlas report](qa/ATLAS-REPORT.md) records that feature's implementation.

## Verification

```powershell
npm.cmd run typecheck
npx.cmd playwright install chromium
npm.cmd run build
npm.cmd run test:e2e
```

Automated tests cover review moderation, authentication, server email payloads/failures, shared rate limiting, editorial services, crystal banner movement, modal booking, cursor states and edge tracking, the palette, six-face cube, desktop mouse input, mobile touch and native scrolling, absence of sensor access and permission controls, live reduced-motion preferences, Atlas, navigation, portfolio, contact, SEO, banner, branding, and layout checks. All core routes are checked at seven widths (320–1440px). Screenshots are captured in `qa/screenshots/`. Tests do not send live email.

For an isolated local test server, run `$env:E2E_BASE_URL='http://localhost:3100'; npm.cmd run test:e2e`. Set the final site origin through `NEXT_PUBLIC_SITE_URL` for deployment; the test server port does not alter canonical configuration.
## Client reviews and admin

See [ADMIN-SETUP.md](./ADMIN-SETUP.md) for hosted PostgreSQL, Gmail, database migration, secure admin creation, and integration-test instructions. Public reviews live at `/reviews`; moderation and client messaging live at `/admin`.

#   Q u i t e - L o g i c  
 #   Q u i t e - L o g i c  
 #   Q u i t e - L o g i c  
 #   Q u i t e - L o g i c  
 