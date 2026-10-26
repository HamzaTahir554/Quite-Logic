# Quiet Logic experience improvements

The compact lower-right Day/Night popover, responsive service-cube controls and durable profile images remain implemented in the existing app.

The custom scheduling experiment was removed selectively. Booking now uses the official Calendly embed, with no API token or local booking engine. See [the current Calendly reset report](CALENDLY-RESET-REPORT.md) for the implementation, configuration cleanup and validation.

## Preserved theme control

One 46px global button opens a keyboard-accessible Day/Claymorphism and Night/Glassmorphism menu. Selection, Escape/outside dismissal, focus restoration, reduced motion and the existing persistent/pre-paint theme system remain intact. Supported viewport fitting keeps the menu visible near screen edges.

## Preserved cube alignment

The variable-length hint and fixed-size controls use a `44px minmax(0,1fr) 44px` grid inside the positioned cube wrapper. The hint wraps without moving arrows outside the wrapper. Existing two-axis dragging, its movement threshold, and scrolling beside the cube are preserved. Coverage includes 320, 360, 375, 390, 412 and 425px.

## Preserved profile images

`Avatar`, `AvatarEditor`, `useImagePreview`, `avatar-storage.ts`, the public media route, Admin profile/review photo routes and their UI remain. Uploaded photos take precedence over optional consented Gravatar; missing/failed images show generated initials. No private email profile scraping or invented authentication-provider image is used.

Clients can add a photo to their review; Admin can change/remove their own DP or a review client's DP. Previews stay local until saved. The server validates MIME and decoded image format, accepts static JPEG/PNG/WebP up to 2 MB/16 megapixels, re-encodes to square 256px WebP and stores bytes durably in `AvatarImage`. Admin/Review records store only the final URL. Anonymous users can retrieve review images only after approval. Image inputs wait until hydration is ready.

The `Admin.avatarUrl`, `Review.avatarUrl`, private avatar hash and opt-in Gravatar flag remain in their existing models. Public review DTOs exclude email. The independent `npm run test:avatars` checks format/size/crop, durable storage and privacy. The authenticated browser workflow continues checking real upload, reload, removal, format rejection and approval-based public access.

Previews retained: [Day theme menu](experience-upgrade/theme-day-390.png), [Night theme menu](experience-upgrade/theme-night-1440.png), [320px cube controls](experience-upgrade/cube-320.png).
