"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMotionPreference } from "@/hooks/useMotionPreference";

export default function TextMotion() {
  const path = usePathname();
  const reduced = useMotionPreference();
  useEffect(() => {
    if (reduced) return;
    const observed = new Set<Element>();
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            const animation = entry.target.animate(
              [
                { opacity: 0.85, translate: "0 4px" },
                { opacity: 1, translate: "0 0" },
              ],
              { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          }
      },
      { threshold: 0.12 },
    );
    const scan = () =>
      document
        .querySelectorAll(
          ".public-site :is(h1,h2,h3,h4,p,blockquote,figcaption,label,.eyebrow)",
        )
        .forEach((element) => {
          if (
            observed.has(element) ||
            element.closest("form,[role=dialog],canvas")
          )
            return;
          observed.add(element);
          observer.observe(element);
        });
    scan();
    const mutations = new MutationObserver(scan);
    const root = document.querySelector(".public-site main");
    if (root) mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [path, reduced]);
  return null;
}
