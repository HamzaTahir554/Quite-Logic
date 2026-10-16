"use client";
import { useEffect, useRef, useState } from "react";
import {
  useInView,
  useReducedMotion,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import type { PointerEvent } from "react";
import Link from "next/link";

export default function DeploymentTerminal({ href }: { href?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.15 });
  const reduced = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [foreground, setForeground] = useState(true);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(mx, { stiffness: 65, damping: 22 });
  const rotateY = useSpring(my, { stiffness: 65, damping: 22 });
  useEffect(() => {
    if (visible) setStarted(true);
  }, [visible]);
  useEffect(() => {
    const update = () => setForeground(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (reduced) {
      mx.set(0);
      my.set(0);
    }
  }, [reduced, mx, my]);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      reduced ||
      event.pointerType !== "mouse" ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      -0.5,
      Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5),
    );
    const y = Math.max(
      -0.5,
      Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5),
    );
    mx.set(-y * 4);
    my.set(x * 4);
  }
  return (
    <div
      className="deployment-stage"
      ref={ref}
      data-started={started}
      data-active={visible && foreground}
      onPointerMove={move}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <span className="deployment-atmosphere" aria-hidden="true" />
      <motion.div
        className="deployment-tilt"
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
      >
        <div className="deployment-float">
          <div
            className="deployment-terminal"
            role="img"
            aria-label="Illustrative deployment terminal: deploy quiet-logic --prod, build complete, checks passed, live in 2.4 seconds."
          >
            <div className="deployment-titlebar" aria-hidden="true">
              <span className="deployment-dots">
                <i />
                <i />
                <i />
              </span>
              <span>atlas / production</span>
              <span>⌘</span>
            </div>
            <div className="deployment-output" aria-hidden="true">
              <div className="deployment-command">
                <span className="deployment-dollar">$</span>
                <span className="deployment-command-text">
                  deploy quiet-logic --prod
                </span>
              </div>
              <div className="deployment-line deployment-build">
                <span className="deployment-check">✓</span>
                <span>build complete</span>
              </div>
              <div className="deployment-line deployment-checks">
                <span className="deployment-check">✓</span>
                <span>checks passed</span>
              </div>
              <div className="deployment-line deployment-live">
                <span className="deployment-arrow">→</span>
                <span>live in 2.4s</span>
                <i className="deployment-cursor" />
              </div>
            </div>
            <div className="deployment-status" aria-hidden="true">
              <span>
                <i />
                ALL SYSTEMS OPERATIONAL
              </span>
              <span>CONCEPT PREVIEW</span>
            </div>
          </div>
        </div>
      </motion.div>
      {href && (
        <Link
          className="atlas-visual-link"
          href={href}
          aria-label="Explore Atlas / Cloud"
          data-cursor="VIEW"
        />
      )}
    </div>
  );
}
