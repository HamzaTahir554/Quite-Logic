"use client";
import { motion } from "framer-motion";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { useRef, useEffect } from "react";
import CrystalReflection from "@/components/motion/CrystalReflection";

export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useMotionPreference();
  const played = useRef(false);
  const animations = useRef<Animation[]>([]);
  useEffect(
    () => () => {
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
    },
    [reduced],
  );
  function reveal(entry: IntersectionObserverEntry | null) {
    entry?.target.setAttribute("data-motion-active", "true");
    if (!entry || reduced || played.current) return;
    played.current = true;
    const options = {
      duration: 420,
      delay: Math.min(delay * 1000, 60),
      easing: "cubic-bezier(.2,.7,.2,1)",
      fill: "backwards" as const,
    };
    const panel = /panel|project|perspective|artwork/.test(className);
    animations.current.push(
      entry.target.animate(
        panel
          ? [
              {
                transform: "translateY(25px) scale(.985)",
                clipPath: "inset(3% 0 0 0 round 28px)",
                opacity: 0.4,
              },
              {
                transform: "translateY(0) scale(1)",
                clipPath: "inset(0 0 0 0 round 28px)",
                opacity: 1,
              },
            ]
          : [
              { opacity: 0.3, transform: "translateY(18px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
        options,
      ),
    );
    entry.target
      .querySelectorAll(
        ".eyebrow,.overline,.section-label,h1,h2,h3,p,.principles li,.chips,.button,.text-link,.project-visual,.about-visual,.case-image,.atlas-visual",
      )
      .forEach((child, index) => {
        const visual = child.matches(
          ".project-visual,.about-visual,.case-image,.atlas-visual",
        );
        animations.current.push(
          child.animate(
            visual
              ? [
                  {
                    clipPath: "inset(0 0 12% 0 round 20px)",
                    transform: "scale(1.025)",
                    opacity: 0.4,
                  },
                  {
                    clipPath: "inset(0 0 0% 0 round 20px)",
                    transform: "scale(1)",
                    opacity: 1,
                  },
                ]
              : [
                  {
                    opacity: 0.15,
                    transform: "translateY(16px)",
                    clipPath: "inset(0 0 50% 0)",
                  },
                  {
                    opacity: 1,
                    transform: "translateY(0)",
                    clipPath: "inset(0 0 0% 0)",
                  },
                ],
            {
              ...options,
              delay: Math.min(delay * 1000, 60) + Math.min(index * 18, 80),
              duration: visual ? 450 : 380,
            },
          ),
        );
      });
  }
  return (
    <motion.div
      className={className}
      initial={false}
      data-motion-active="false"
      viewport={{ amount: 0.08 }}
      onViewportEnter={reveal}
      onViewportLeave={(entry) =>
        entry?.target.setAttribute("data-motion-active", "false")
      }
    >
      {children}
      {/cta-panel|about-panel/.test(className) && <CrystalReflection />}
    </motion.div>
  );
}
