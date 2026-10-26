import { meetingUrl } from "./company";
import { palettes, type VisualTheme } from "@/theme/tokens";

export const calendlyScriptUrl =
  "https://assets.calendly.com/assets/external/widget.js";
export const calendlyOrigin = "https://calendly.com";

/** Official inline embed options; branding is inherited from the account. */
export function calendlyEmbedUrl(
  hostname: string,
  theme: VisualTheme = "night",
) {
  const url = new URL(meetingUrl);
  url.search = new URLSearchParams({
    embed_domain: hostname,
    embed_type: "Inline",
    hide_event_type_details: "1",
    background_color:
      theme === "day"
        ? palettes.day.background.slice(1).toLowerCase()
        : "303944",
    text_color:
      theme === "day" ? palettes.day.primary.slice(1).toLowerCase() : "f0f1f8",
    primary_color: "2f80fe",
  }).toString();
  return url.toString();
}
