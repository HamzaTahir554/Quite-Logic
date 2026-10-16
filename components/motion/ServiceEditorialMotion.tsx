"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";

export default function ServiceEditorialMotion({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const played = useRef(false);
  const reduced = useMotionPreference();
  useEffect(() => {
    const section = ref.current;
    if (!section || reduced) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played.current) return;
        played.current = true;
        const options: KeyframeAnimationOptions = {
          duration: 450,
          easing: "cubic-bezier(.22,1,.36,1)",
          fill: "backwards",
        };
        const art = section.querySelector(".service-art-reveal");
        if (art)
          animations.push(
            art.animate(
              [
                {
                  clipPath: "inset(0 0 12% 0)",
                  transform: "scale(1.04)",
                  opacity: 0.4,
                },
                {
                  clipPath: "inset(0 0 0% 0)",
                  transform: "scale(1)",
                  opacity: 1,
                },
              ],
              options,
            ),
          );
        section
          .querySelectorAll(".service-reveal-text")
          .forEach((element, index) => {
            animations.push(
              element.animate(
                [
                  { opacity: 0, transform: "translate3d(0,12px,0)" },
                  { opacity: 1, transform: "translate3d(0,0,0)" },
                ],
                { ...options, duration: 380, delay: index * 20 },
              ),
            );
          });
        observer.disconnect();
      },
      { threshold: 0.12 },
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [reduced]);

  useEffect(() => {
    const frame = ref.current?.querySelector<HTMLElement>(".service-art-frame");
    const drift = frame?.querySelector<HTMLElement>(".service-art-drift");
    if (!frame || !drift || reduced) return;
    const media = matchMedia(
      "(min-width: 901px) and (hover: hover) and (pointer: fine)",
    );
    let raf = 0,
      x = 0,
      y = 0;
    const reset = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      drift.style.transform = "translate3d(0,0,0)";
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== "mouse") return;
      const bounds = frame.getBoundingClientRect();
      x = Math.max(
        -4,
        Math.min(4, ((event.clientX - bounds.left) / bounds.width) * 8 - 4),
      );
      y = Math.max(
        -4,
        Math.min(4, ((event.clientY - bounds.top) / bounds.height) * 8 - 4),
      );
      if (!raf)
        raf = requestAnimationFrame(() => {
          drift.style.transform = `translate3d(${x}px,${y}px,0)`;
          raf = 0;
        });
    };
    frame.addEventListener("pointermove", move, { passive: true });
    frame.addEventListener("pointerleave", reset);
    frame.addEventListener("pointercancel", reset);
    media.addEventListener("change", reset);
    return () => {
      reset();
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerleave", reset);
      frame.removeEventListener("pointercancel", reset);
      media.removeEventListener("change", reset);
    };
  }, [reduced]);
  return (
    <section ref={ref} className="service-editorial" id={id}>
      {children}
    </section>
  );
}
