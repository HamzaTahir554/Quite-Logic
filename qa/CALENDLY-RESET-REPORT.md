# Simple Calendly integration

The custom scheduling experiment was selectively removed after reviewing the working diff and Git history (`b3a3b8f` contains the earlier official embed). The retained header/contact Fabric CTA opens Calendly inside the existing MUI modal. The embed uses `https://calendly.com/company-quitelogic/30min`, loads the official widget script on demand and keeps an always-available direct scheduling link.

There are no local date/time steps or local booking confirmations. Calendly owns availability, invitee details, conflicts, booking and confirmation. Its branding and cookie UI are not hidden, masked or modified. Quiet Logic styles only the surrounding modal; supported URL color options match the selected theme when the modal opens. Changing the outer theme while booking does not reload the frame and erase invitee input.

## Selective changes

Restored `components/booking/CalendlyEmbed.tsx`, the embed URL helper in `lib/calendly.ts` and the isolated widget test fixture from the earlier integration. The embed helper no longer tracks custom booking steps. It retains loading/error feedback, retry, one shared script load, frame labeling and cleanup of observers/listeners. Closing during a script load cannot initialize an abandoned frame.

`BookingProvider` retains the shared Fabric button and accessible MUI dialog, and now renders the official embed plus the external fallback link. The header CTA remains compact. The Contact section uses “Send us a message” and “Book a Meeting” without an availability grid. Mobile styling reserves the vendor's minimum 320px frame width and lets content scroll without clipping or hiding branding.

Removed only experiment-specific code:

- `MeetingCalendar`, `MeetingManager`, `lib/meetings.ts`, `lib/meeting-config.ts` and `lib/calendly-api.ts`.
- Public `/api/meetings/availability`, `/book`, `/webhook` handlers, the experimental Admin meeting APIs/page/navigation entry, direct invitee creation, synchronization, signature verification and interval/lead-time logic.
- `Booking`, `BookingHold` and `BookingLease` schemas and all active usage. Other MongoDB models, including the newer `AvatarImage`, remain intact.
- Scheduling-only CLI commands/scripts, the availability test fixture, custom calendar CSS and obsolete calendar-grid previews. Avatar validation coverage was retained separately as `scripts/test-avatars.ts` / `npm run test:avatars`.

No package was installed exclusively for the experiment: all dependencies remain shared with the rest of the app. The lockfile and dependencies were left unchanged.

The theme popover, cube control alignment, DP upload workflows, authentication, SMTP, portfolio, reviews, social management, floating water header, graph and SEO are preserved.

## Configuration and security

The simple embed needs no API credentials or booking-related environment variables. Its URL remains in `lib/company.ts`. Obsolete Calendly settings were removed from the tracked template and checked locally without printing their values.

An access token was found in the tracked `.env.example` template and removed. Revoke/rotate that token in Calendly. It is not needed by this integration.

When redeploying, remove obsolete scheduling variables from hosting settings if present: `CALENDLY_ACCESS_TOKEN`, `CALENDLY_EVENT_TYPE_URI`, `CALENDLY_USER_URI`, `CALENDLY_WEBHOOK_SECRET`, `CALENDLY_DIRECT_BOOKING_ENABLED`, `BOOKING_TIMEZONE` and `MIN_BOOKING_LEAD_MINUTES`. Keep all unrelated MongoDB, SMTP, authentication, site URL and proxy settings.

If an experimental Calendly webhook subscription was registered externally, disable that subscription in Calendly; the application no longer serves it. This reset did not change account settings or cancel any actual Calendly events.

## Production database

No production connection, record deletion, collection drop or index removal was performed. Removing model definitions does not delete stored data. If experiment records were ever created, the potentially obsolete collections are `bookings`, `bookingholds` and `bookingleases` (Mongoose default pluralization). Review them manually with a backup and confirm no other application uses them before deciding on cleanup. Existing MongoDB TTL indexes operate independently of this application until explicitly changed. All unrelated collections remain in use.

## Verification

Checks use a production build, disposable MongoDB and an explicit third-party fixture. No SMTP mail is sent by these focused checks. No real appointment is created. Booking checks cover header/contact triggers, both themes, 320/375/390/425/768/1440px, vendor UI/branding, failure/retry, close/reopen during loading, focus restoration, absence of custom API traffic and 404 responses for removed endpoints. Existing avatar, contact/SMTP, Admin, portfolio, review, graph, navigation and SEO checks are preserved. Final validation totals are recorded after execution.

Completed validation: production build, regenerated route types, TypeScript, ESLint, formatting and whitespace checks passed. All **22 focused browser tests passed**, including real authenticated DP upload/removal and moderation privacy; the independent avatar suite passed **10 assertions**. The new build contains no custom scheduling routes. No broader suite or real Calendly booking was run for this reset; third-party behavior was exercised using the isolated fixture, and physical phones were not used.

Previews use that explicit test fixture: [320px Night](calendly-reset/night-320.png), [320px Day](calendly-reset/day-320.png), [tablet](calendly-reset/night-768.png), [desktop](calendly-reset/night-1440.png). They verify the surrounding layout rather than claim a live appointment was booked.

Official reference: [Calendly JavaScript embed documentation](https://calendly.com/help/advanced-calendly-embed-for-developers). A final live smoke check of the external account's scheduling page is still appropriate after deployment; automated booking tests deliberately avoid creating a real meeting.
