"use client";

import { useEffect } from "react";

export default function GlassLighting() {
  useEffect(() => {
    const media = matchMedia(
      "(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let active: HTMLElement | null = null;
    let frame = 0;
    let x = 0;
    let y = 0;
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      active?.removeAttribute("data-glass-lit");
      active?.style.removeProperty("--glass-pointer-x");
      active?.style.removeProperty("--glass-pointer-y");
      active = null;
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || document.hidden || event.pointerType !== "mouse") {
        clear();
        return;
      }
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-glass-light]")
          : null;
      if (target !== active) {
        clear();
        active = target;
      }
      if (!active) return;
      x = event.clientX;
      y = event.clientY;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!active?.isConnected) return clear();
          const rect = active.getBoundingClientRect();
          active.style.setProperty("--glass-pointer-x", `${x - rect.left}px`);
          active.style.setProperty("--glass-pointer-y", `${y - rect.top}px`);
          active.dataset.glassLit = "true";
        });
    };
    const out = (event: PointerEvent) => {
      if (
        active &&
        (!(event.relatedTarget instanceof Node) ||
          !active.contains(event.relatedTarget))
      )
        clear();
    };
    // One passive listener and at most one frame per input change; no idle loop.
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", out, { passive: true });
    document.addEventListener("pointercancel", clear);
    document.addEventListener("click", clear, { passive: true });
    document.addEventListener("visibilitychange", clear);
    document.addEventListener("scroll", clear, {
      passive: true,
      capture: true,
    });
    media.addEventListener("change", clear);
    return () => {
      clear();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointercancel", clear);
      document.removeEventListener("click", clear);
      document.removeEventListener("visibilitychange", clear);
      document.removeEventListener("scroll", clear, true);
      media.removeEventListener("change", clear);
    };
  }, []);
  return null;
}
