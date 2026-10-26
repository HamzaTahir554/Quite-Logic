"use client";
import { useEffect, useRef, useState } from "react";
import { calendlyOrigin, calendlyScriptUrl } from "@/lib/calendly";

type CalendlyAPI = {
  initInlineWidget(options: {
    url: string;
    parentElement: HTMLElement;
    resize: boolean;
  }): void;
};
const calendlyWindow = () => window as Window & { Calendly?: CalendlyAPI };
let scriptPromise: Promise<CalendlyAPI> | null = null;

/** Official widget script, shared across opens and loaded only on demand. */
function loadCalendly() {
  const existing = calendlyWindow().Calendly;
  if (existing?.initInlineWidget) return Promise.resolve(existing);
  if (!scriptPromise)
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
  return scriptPromise;
}

export default function CalendlyEmbed({ url }: { url: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "slow" | "error">(
    "loading",
  );
  useEffect(() => {
    const element = container.current!;
    let disposed = false,
      ready = false;
    let frame: HTMLIFrameElement | null = null;
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
    const receive = (message: MessageEvent) => {
      if (
        message.origin === calendlyOrigin &&
        frame?.contentWindow &&
        message.source === frame.contentWindow &&
        typeof message.data?.event === "string" &&
        message.data.event.startsWith("calendly.")
      )
        loaded();
    };
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
              <span>Loading Calendly…</span>
            </>
          ) : (
            <>
              <span>
                {status === "slow"
                  ? "The calendar is taking a little longer to load."
                  : "We couldn’t load Calendly. Try again or use the link below."}
              </span>
              <button
                type="button"
                className="booking-text-button"
                onClick={() => {
                  setStatus("loading");
                  setRevision((value) => value + 1);
                }}
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
