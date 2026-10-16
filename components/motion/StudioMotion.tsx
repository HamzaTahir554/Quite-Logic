"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import StudioCursor from "./StudioCursor";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import BrandName from "@/components/ui/BrandName";
import {
  motion,
  useAnimationControls,
  useScroll,
  useSpring,
} from "framer-motion";

function NavigationTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useMotionPreference();
  const controls = useAnimationControls();
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    busy.current = false;
    void controls.start({
      scaleY: 0,
      transition: { duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] },
    });
    document
      .getElementById("main")
      ?.animate([{ transform: "scale(.985)" }, { transform: "scale(1)" }], {
        duration: reduced ? 0 : 350,
        easing: "ease-out",
      });
  }, [pathname, controls, reduced]);
  useEffect(() => {
    if (reduced) return;
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname)
        return;
      event.preventDefault();
      if (busy.current) return;
      busy.current = true;
      document
        .getElementById("main")
        ?.animate([{ transform: "scale(1)" }, { transform: "scale(.985)" }], {
          duration: 180,
          easing: "ease-out",
        });
      timer.current = setTimeout(() => {
        busy.current = false;
        void controls.start({ scaleY: 0, transition: { duration: 0.2 } });
      }, 1800);
      void controls
        .start({
          scaleY: 1,
          transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
        })
        .then(() => router.push(url.pathname + url.search + url.hash));
    };
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("click", click, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router, controls, reduced]);
  return (
    <motion.div
      className="route-curtain"
      aria-hidden="true"
      initial={{ scaleY: 0 }}
      animate={controls}
    >
      <span className="route-blue-line" />
      <BrandName />
    </motion.div>
  );
}

export default function StudioMotion() {
  useEffect(() => {
    document.documentElement.dataset.studioReady = "true";
    const visibility = () => {
      document.documentElement.dataset.motionPaused = String(document.hidden);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      delete document.documentElement.dataset.studioReady;
      delete document.documentElement.dataset.motionPaused;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const { scrollYProgress } = useScroll();
  const reduced = useMotionPreference();
  const progress = useSpring(scrollYProgress, { stiffness: 150, damping: 30 });
  return (
    <>
      <div className="ambient-studio" aria-hidden="true">
        <span />
        <span />
        <div />
      </div>
      <motion.div
        aria-hidden="true"
        className="scroll-progress"
        style={{ scaleX: reduced ? scrollYProgress : progress }}
      />
      <StudioCursor />
      <NavigationTransition />
    </>
  );
}
