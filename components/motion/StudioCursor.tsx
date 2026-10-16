"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";
const query = "(min-width: 901px) and (hover: hover) and (pointer: fine)";
const snapshot = () =>
  matchMedia(query).matches && navigator.maxTouchPoints === 0;
const serverSnapshot = () => false;
function subscribe(change: () => void) {
  const media = matchMedia(query);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}
export default function StudioCursor() {
  const eligible = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const reduced = useMotionPreference();
  const enabled = eligible && !reduced;
  const root = useRef<HTMLDivElement>(null),
    ring = useRef<HTMLSpanElement>(null),
    label = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!enabled || !root.current || !ring.current) return;
    const node = root.current,
      outline = ring.current;
    let x = 0,
      y = 0,
      rx = 0,
      ry = 0,
      frame = 0,
      visible = false,
      last = 0;
    const hide = () => {
      visible = false;
      node.style.opacity = "0";
      delete document.documentElement.dataset.studioCursor;
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const classify = (target: Element) => {
      if (
        target.closest("input,textarea,select,iframe,[contenteditable=true]")
      ) {
        hide();
        return;
      }
      const value = target
        .closest("[data-cursor]")
        ?.getAttribute("data-cursor");
      const kind =
        value === "VIEW" || value === "OPEN"
          ? value
          : target.closest("a")?.querySelector("img")
            ? "OPEN"
            : target.closest("a,button,[role=button],[role=combobox]")
              ? "interactive"
              : "normal";
      if (node.dataset.state !== kind) {
        node.dataset.state = kind;
        if (label.current)
          label.current.textContent =
            kind === "VIEW" || kind === "OPEN" ? kind : "";
      }
    };
    const tick = (time: number) => {
      frame = 0;
      if (!visible) return;
      // Dot tracks the latest pointer exactly. Only the ring interpolates.
      const strength =
        1 -
        Math.pow(0.65, Math.min(2, (time - (last || time - 16.67)) / 16.67));
      last = time;
      rx += (x - rx) * strength;
      ry += (y - ry) * strength;
      node.style.transform = `translate3d(${x}px,${y}px,0)`;
      outline.style.transform = `translate3d(${rx - x}px,${ry - y}px,0)`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.1)
        frame = requestAnimationFrame(tick);
      else last = 0;
    };
    const move = (event: PointerEvent) => {
      if (
        event.pointerType !== "mouse" ||
        event.buttons !== 0 ||
        !(event.target instanceof Element) ||
        event.target.closest(
          "input,textarea,select,iframe,[contenteditable=true]",
        )
      ) {
        hide();
        return;
      }
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        rx = x;
        ry = y;
      }
      visible = true;
      node.style.opacity = "1";
      document.documentElement.dataset.studioCursor = "active";
      classify(event.target);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const scroll = () => {
      if (visible) {
        const target = document.elementFromPoint(x, y);
        if (target) classify(target);
      }
    };
    const visibility = () => {
      if (document.hidden) hide();
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", hide);
    document.addEventListener("pointerdown", hide, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("pointerdown", hide);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", scroll);
      hide();
    };
  }, [enabled]);
  if (!enabled) return null;
  return (
    <div
      ref={root}
      className="studio-cursor"
      data-state="normal"
      aria-hidden="true"
      style={{ opacity: 0 }}
    >
      <span ref={ring} className="cursor-ring" />
      <span className="cursor-dot" />
      <span ref={label} className="cursor-label" />
    </div>
  );
}
