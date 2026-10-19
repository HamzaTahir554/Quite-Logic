"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import Image from "next/image";
import { meetingUrl } from "@/lib/company";
import { calendlyEmbedUrl, type BookingStep } from "@/lib/calendly";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import CalendlyEmbed from "./CalendlyEmbed";
import { useVisualTheme } from "@/theme/VisualThemeProvider";

const BookingContext = createContext<(() => void) | null>(null);
function BookingCheck({ header = false }: { header?: boolean }) {
  return (
    <svg
      className={`booking-success-icon${header ? " booking-header-check" : ""}`}
      width={header ? 32 : 42}
      height={header ? 32 : 42}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="21" pathLength="1" />
      <path d="m14 24 7 7 13-15" pathLength="1" />
    </svg>
  );
}
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
      aria-label="Book a Meeting"
    >
      <span className="button-label">Book a Meeting</span>
      <span className="button-arrow" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}

export default function BookingProvider({ children }: { children: ReactNode }) {
  const { theme } = useVisualTheme();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<BookingStep>("time");
  const reduced = useMotionPreference();
  function open() {
    setStep("time");
    setUrl(calendlyEmbedUrl(location.hostname, theme));
  }
  return (
    <BookingContext.Provider value={open}>
      {children}
      <Dialog
        open={Boolean(url)}
        onClose={() => setUrl("")}
        maxWidth="lg"
        fullWidth
        aria-labelledby="booking-title"
        transitionDuration={reduced ? 0 : 250}
        slotProps={{ paper: { className: "booking-dialog" } }}
      >
        <DialogTitle id="booking-title" className="booking-title">
          {step === "confirmed" ? (
            <BookingCheck header />
          ) : (
            <Image src="/logo/icon.png" width={32} height={32} alt="" />
          )}
          <span>
            Book a Meeting
            <small
              key={step === "confirmed" ? "confirmed" : "pending"}
              className={
                step === "confirmed" ? "booking-confirmed-label" : undefined
              }
            >
              {step === "confirmed"
                ? "Confirmed · 30 minutes · Quite Logic"
                : "30 minutes · Quite Logic"}
            </small>
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
          <div className="booking-workspace" data-step={step}>
            <aside className="booking-intro">
              <span className="booking-eyebrow">A thoughtful first step</span>
              <h2>
                Good ideas start
                <br />
                with a conversation.
              </h2>
              <p>
                Tell us what you’re working on. We’ll explore the possibilities
                and a useful next step.
              </p>
              <div className="booking-meeting-facts">
                <span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  30 minutes
                </span>
                <span>Times in your selected timezone</span>
              </div>
              <ol className="booking-progress" aria-label="Booking progress">
                {(
                  [
                    ["time", "Choose a time"],
                    ["details", "Your details"],
                    ["confirmed", "Confirmed"],
                  ] as const
                ).map(([value, label], index) => {
                  const active = step === value;
                  const complete =
                    step === "confirmed" || (step === "details" && index === 0);
                  return (
                    <li
                      key={value}
                      aria-current={active ? "step" : undefined}
                      data-complete={complete}
                    >
                      <span className="booking-step-marker" aria-hidden="true">
                        {complete ? "✓" : `0${index + 1}`}
                      </span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ol>
              <div
                className="booking-step-feedback"
                aria-live="polite"
                aria-atomic="true"
              >
                <div key={step} className="booking-step-copy">
                  {step === "confirmed" ? (
                    <>
                      <BookingCheck />
                      <h3>You’re booked.</h3>
                      <p>
                        Calendly has confirmed your meeting. Your invitation has
                        the time and joining details.
                      </p>
                    </>
                  ) : step === "details" ? (
                    <>
                      <h3>A time that works.</h3>
                      <p>
                        Add your details in the calendar to finish booking. Your
                        meeting is confirmed after you submit.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>Make room for what’s next.</h3>
                      <p>
                        Choose an available date and time in the calendar. Times
                        are shown in your selected timezone.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </aside>
            <div className="booking-embed-panel" aria-label="Meeting calendar">
              {url && (
                <CalendlyEmbed
                  url={url}
                  onStep={(next) =>
                    setStep((current) =>
                      current === "confirmed" ? current : next,
                    )
                  }
                />
              )}
            </div>
          </div>
        </DialogContent>
        <div className="booking-footer">
          <p className="booking-fallback">
            Prefer a separate tab?{" "}
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
              Open Calendly in a new tab ↗
            </a>
          </p>
          <span>Clear questions. A useful next step.</span>
        </div>
      </Dialog>
    </BookingContext.Provider>
  );
}
