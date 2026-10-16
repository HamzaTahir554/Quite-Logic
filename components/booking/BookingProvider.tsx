"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { meetingUrl } from "@/lib/company";
import { useMotionPreference } from "@/hooks/useMotionPreference";

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
    <button
      type="button"
      className={`button magnetic ${secondary ? "secondary" : "primary"} ${className}`}
      onClick={() => open?.()}
      aria-haspopup="dialog"
    >
      <span className="button-label">Book a Meeting</span>
      <span className="button-arrow" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}

export default function BookingProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const reduced = useMotionPreference();
  function open() {
    const embed = new URL(meetingUrl);
    embed.search = new URLSearchParams({
      embed_domain: location.hostname,
      embed_type: "Inline",
      background_color: "303944",
      text_color: "f0f1f8",
      primary_color: "2f80fe",
    }).toString();
    setLoaded(false);
    setUrl(embed.toString());
  }
  return (
    <BookingContext.Provider value={open}>
      {children}
      <Dialog
        open={Boolean(url)}
        onClose={() => setUrl("")}
        maxWidth="md"
        fullWidth
        aria-labelledby="booking-title"
        transitionDuration={reduced ? 0 : 200}
        slotProps={{ paper: { className: "booking-dialog" } }}
      >
        <DialogTitle id="booking-title" className="booking-title">
          Book a Meeting <span>30 minutes · Quite Logic</span>
          <IconButton aria-label="Close booking" onClick={() => setUrl("")}>
            ×
          </IconButton>
        </DialogTitle>
        <DialogContent className="booking-content">
          <div className="booking-frame">
            {!loaded && (
              <p className="booking-loading" role="status">
                Loading available times…
              </p>
            )}
            {url && (
              <iframe
                src={url}
                title="Book a 30-minute meeting with Quite Logic"
                onLoad={() => setLoaded(true)}
              />
            )}
          </div>
          <p className="booking-fallback">
            Calendar not loading?{" "}
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
              Open Calendly in a new tab ↗
            </a>
          </p>
        </DialogContent>
      </Dialog>
    </BookingContext.Provider>
  );
}
