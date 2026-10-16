"use client";
import { useEffect, type RefObject } from "react";
import { useMotionPreference } from "./useMotionPreference";

// Animate only while input is changing; no idle frame loop or touch interception.
export function useCrystalPointer(
  ref: RefObject<HTMLElement | null>,
  selector = "",
  parent = false,
) {
  const reduced = useMotionPreference();
  useEffect(() => {
    const root = parent ? ref.current?.parentElement : ref.current;
    if (!root || reduced || navigator.maxTouchPoints > 0) return;
    const media = matchMedia(
      "(min-width: 901px) and (hover: hover) and (pointer: fine)",
    );
    const layers = selector
      ? Array.from(root.querySelectorAll<HTMLElement>(selector))
      : [];
    const light = root.querySelector<HTMLElement>(".crystal-light");
    let raf = 0,
      tx = 0,
      ty = 0,
      x = 0,
      y = 0,
      last = 0;
    const clear = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      x = y = tx = ty = 0;
      layers.forEach((layer) => {
        layer.style.removeProperty("translate");
        layer.style.removeProperty("rotate");
        layer.style.removeProperty("will-change");
      });
      light?.style.removeProperty("transform");
      light?.style.removeProperty("will-change");
    };
    const frame = (now: number) => {
      const alpha = 1 - Math.exp(-18 * Math.min((now - last) / 1000, 0.04));
      last = now;
      x += (tx - x) * alpha;
      y += (ty - y) * alpha;
      layers.forEach((layer, index) => {
        const depth = layer.matches("h1")
          ? 1
          : layer.matches("p")
            ? 0.65
            : 0.45 + Math.min(index, 3) * 0.08;
        layer.style.translate = `${x * 6 * depth}px ${y * 4 * depth}px 0`;
        const rx = -y * 0.8 * depth,
          ry = x * 1.2 * depth;
        layer.style.rotate = `${rx || 0.0001} ${ry} 0 ${Math.hypot(rx, ry)}deg`;
      });
      if (light)
        light.style.transform = `translate3d(calc(-50% + ${x * 140}px),calc(-50% + ${y * 80}px),0)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.001)
        raf = requestAnimationFrame(frame);
      else {
        raf = 0;
        if (!tx && !ty) clear();
      }
    };
    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== "mouse") return;
      layers.forEach((layer) => {
        layer.style.willChange = "translate, rotate";
      });
      if (light) light.style.willChange = "transform";
      const rect = root.getBoundingClientRect();
      tx = Math.max(
        -1,
        Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2),
      );
      ty = Math.max(
        -1,
        Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2),
      );
      start();
    };
    const leave = () => {
      tx = ty = 0;
      start();
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) clear();
    });
    observer.observe(root);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    root.addEventListener("pointercancel", clear);
    media.addEventListener("change", clear);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clear();
      observer.disconnect();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("pointercancel", clear);
      media.removeEventListener("change", clear);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [ref, selector, parent, reduced]);
}
