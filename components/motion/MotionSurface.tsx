"use client";
import { useRef } from "react";
import { useInView } from "framer-motion";

// Continuous decorative CSS motion only runs close to the viewport.
export default function MotionSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: "120px" });
  return (
    <div ref={ref} className={className} data-motion-active={visible}>
      {children}
    </div>
  );
}
