"use client";
import { useEffect, useRef, useState } from "react";
import {
  bookingStepFromMessage,
  calendlyScriptUrl,
  type BookingStep,
} from "@/lib/calendly";

type CalendlyAPI = {
  initInlineWidget: (options: {
    url: string;
    parentElement: HTMLElement;
    resize: boolean;
  }) => void;
};
const calendlyWindow = () => window as Window & { Calendly?: CalendlyAPI };
let scriptPromise: Promise<CalendlyAPI> | null = null;

// Load once on demand. Failed loads can be retried using the same official URL.
function loadCalendly() {
  const existing = calendlyWindow().Calendly;
  if (existing?.initInlineWidget) return Promise.resolve(existing);
  if (!scriptPromise) {
    scriptPromise = new Promise<CalendlyAPI>((resolve, reject) => {
      const script = document.createElement("script");
      const fail = () => {
        clearTimeout(timer);
        script.remove();
        scriptPromise = null;
        reject(new Error("Calendar unavailable"));
      };
      const timer = setTimeout(fail, 20000);
      script.src = calendlyScriptUrl;
      script.async = true;
      script.onload = () => {
        const api = calendlyWindow().Calendly;
        if (!api?.initInlineWidget) return fail();
        clearTimeout(timer);
        resolve(api);
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function CalendlyEmbed({
  url,
  onStep,
}: {
  url: string;
  onStep: (step: BookingStep) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "slow" | "error">(
    "loading",
  );
  const callback = useRef(onStep);
  useEffect(() => {
    callback.current = onStep;
  }, [onStep]);
  useEffect(() => {
    const element = container.current!;
    let disposed = false;
    let frame: HTMLIFrameElement | null = null;
    let ready = false;
    const loaded = () => {
      ready = true;
      if (!disposed) setStatus("ready");
    };
    const labelFrame = () => {
      const next = element.querySelector("iframe");
      if (!next || next === frame) return;
      frame?.removeEventListener("load", loaded);
      frame = next;
      frame.title = "Book a 30-minute meeting with Quite Logic";
      frame.addEventListener("load", loaded);
    };
    const observer = new MutationObserver(labelFrame);
    observer.observe(element, { childList: true, subtree: true });
    function receive(message: MessageEvent) {
      const step = bookingStepFromMessage(
        message,
        frame?.contentWindow || null,
      );
      if (!step || disposed) return;
      loaded();
      callback.current(step);
    }
    window.addEventListener("message", receive);
    const timer = setTimeout(() => {
      if (!ready && !disposed)
        setStatus((current) => (current === "error" ? current : "slow"));
    }, 12000);
    void loadCalendly()
      .then((api) => {
        if (disposed) return;
        api.initInlineWidget({ url, parentElement: element, resize: false });
        labelFrame();
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("message", receive);
      frame?.removeEventListener("load", loaded);
      element.replaceChildren();
    };
  }, [url, revision]);
  function retry() {
    setStatus("loading");
    callback.current("time");
    setRevision((value) => value + 1);
  }
  return (
    <div className="booking-calendar" data-calendar-state={status}>
      {status !== "ready" && (
        <div
          className={`booking-calendar-notice is-${status}`}
          role={status === "error" ? "alert" : "status"}
        >
          {status === "loading" ? (
            <>
              <span className="booking-loading-mark" aria-hidden="true" />
              <span>Loading available times…</span>
            </>
          ) : (
            <>
              <span>
                {status === "slow"
                  ? "The calendar is taking a little longer to load."
                  : "We couldn’t load the calendar. Please try again or use the link below."}
              </span>
              <button
                type="button"
                className="booking-text-button"
                onClick={retry}
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}
      <div className="booking-frame booking-calendly-embed" ref={container} />
    </div>
  );
}
