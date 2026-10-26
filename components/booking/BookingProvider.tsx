"use client";
import FabricButton from "@/components/ui/FabricButton";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import CalendlyEmbed from "./CalendlyEmbed";
import { calendlyEmbedUrl } from "@/lib/calendly";
import { meetingUrl } from "@/lib/company";
import { useVisualTheme } from "@/theme/VisualThemeProvider";
import Arrow from "@/components/ui/Arrow";
const BookingContext = createContext<(() => void) | null>(null);
export function BookingButton({
  className = "",
  secondary = false,
}: {
  className?: string;
  secondary?: boolean;
}) {
  const open = useContext(BookingContext);
  return (
    <FabricButton
      type="button"
      variant={secondary ? "secondary" : "primary"}
      className={className}
      onClick={() => open?.()}
      aria-haspopup="dialog"
      aria-label="Book a Meeting"
    >
      Book a Meeting
    </FabricButton>
  );
}
export default function BookingProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState("");
  const { theme } = useVisualTheme();
  const reduced = useMotionPreference();
  return (
    <BookingContext.Provider
      value={() => setUrl(calendlyEmbedUrl(location.hostname, theme))}
    >
      {children}
      <Dialog
        open={Boolean(url)}
        onClose={() => setUrl("")}
        maxWidth="md"
        fullWidth
        aria-labelledby="booking-title"
        transitionDuration={reduced ? 0 : 220}
        slotProps={{
          paper: { className: "booking-dialog simple-booking-dialog" },
        }}
      >
        <DialogTitle id="booking-title" className="booking-title">
          <span>
            Book a Meeting<small>Quite Logic · A thoughtful first step</small>
          </span>
          <IconButton aria-label="Close booking" onClick={() => setUrl("")}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </IconButton>
        </DialogTitle>
        <DialogContent className="booking-content">
          <div className="booking-embed-panel" aria-label="Calendly scheduling">
            {url && <CalendlyEmbed url={url} />}
          </div>
        </DialogContent>
        <div className="booking-footer">
          <p className="booking-fallback">
            Prefer a separate tab?{" "}
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
              Open Calendly in a new tab <Arrow />
            </a>
          </p>
        </div>
      </Dialog>
    </BookingContext.Provider>
  );
}
