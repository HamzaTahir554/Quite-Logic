"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/** One queued frame per scroll burst; React only receives threshold changes. */
export function useHeaderScroll(
  header: RefObject<HTMLElement | null>,
  menuOpen: boolean,
) {
  const [state, setState] = useState({ compact: false, down: false });
  const current = useRef(state);
  useEffect(() => {
    let frame = 0;
    let previous = Math.max(0, scrollY),
      travel = 0,
      direction = 0;
    function update() {
      frame = 0;
      const y = Math.max(0, scrollY);
      const delta = y - previous;
      previous = y;
      const interacting =
        menuOpen ||
        header.current?.querySelector(":focus-visible") ||
        document.querySelector('[aria-modal="true"]');
      if (interacting) {
        travel = 0;
        return;
      }
      const nextDirection = Math.sign(delta);
      if (nextDirection && nextDirection !== direction) {
        travel = 0;
        direction = nextDirection;
      }
      travel += delta;
      const compact = current.current.compact ? y > 64 : y >= 104;
      const down =
        y < 160 || !compact
          ? false
          : travel >= 32
            ? true
            : travel <= -18
              ? false
              : current.current.down;
      if (
        compact !== current.current.compact ||
        down !== current.current.down
      ) {
        current.current = { compact, down };
        setState(current.current);
      }
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    addEventListener("scroll", queue, { passive: true });
    return () => {
      removeEventListener("scroll", queue);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [header, menuOpen]);
  return state;
}
