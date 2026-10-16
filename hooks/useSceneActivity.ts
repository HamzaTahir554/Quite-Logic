"use client";
import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "./useMotionPreference";

export function useSceneActivity(allowWebGL = true) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  const [supported, setSupported] = useState(false);
  const [visible, setVisible] = useState(false);
  const [near, setNear] = useState(false);
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "120px" },
    );
    if (ref.current) observer.observe(ref.current);
    const onVisibility = () => setForeground(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);
  useEffect(() => {
    if (!near || reduced || !allowWebGL) return;
    const device = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    if (
      device.connection?.saveData ||
      (device.deviceMemory !== undefined && device.deviceMemory <= 2) ||
      (device.hardwareConcurrency && device.hardwareConcurrency <= 2)
    )
      return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    setSupported(!!context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }, [near, reduced, allowWebGL]);
  return {
    ref,
    enabled: supported && !reduced && allowWebGL,
    active: visible && foreground && !reduced,
  };
}
