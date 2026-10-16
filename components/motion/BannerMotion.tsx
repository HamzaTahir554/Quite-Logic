"use client";
import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useCrystalPointer } from "@/hooks/useCrystalPointer";
export type BannerVariant =
  | "studio"
  | "services"
  | "about"
  | "work"
  | "portfolio"
  | "contact"
  | "project";
export default function BannerMotion({
  variant,
  children,
}: {
  variant: BannerVariant;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useCrystalPointer(
    ref,
    ".banner-content > h1, .banner-content > p, .banner-content > .eyebrow",
  );
  const reduced = useReducedMotion();
  const visible = useInView(ref, { margin: "120px" });
  useEffect(() => {
    if (reduced || !ref.current) return;
    const animations: Animation[] = [];
    const options = {
      duration: 400,
      easing: "cubic-bezier(.2,.7,.2,1)",
      fill: "backwards" as const,
    };
    const eyebrow = ref.current.querySelector(".eyebrow");
    if (eyebrow)
      animations.push(
        eyebrow.animate(
          [
            { opacity: 0.2, transform: "translateY(10px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          options,
        ),
      );
    const heading = ref.current.querySelector("h1");
    if (heading) {
      if (variant === "services" || variant === "work" || variant === "contact")
        heading.querySelectorAll(".banner-word").forEach((word, i) =>
          animations.push(
            word.animate(
              variant === "services"
                ? [
                    {
                      transform: "translateY(100%) rotateX(12deg)",
                      opacity: 0.15,
                    },
                    { transform: "translateY(0) rotateX(0)", opacity: 1 },
                  ]
                : variant === "work"
                  ? [
                      {
                        transform: "translateX(-18px)",
                        opacity: 0.15,
                        clipPath: "inset(0 100% 0 0)",
                      },
                      {
                        transform: "translateX(0)",
                        opacity: 1,
                        clipPath: "inset(0 0% 0 0)",
                      },
                    ]
                  : [
                      { transform: "translateY(16px)", opacity: 0.1 },
                      { transform: "translateY(0)", opacity: 1 },
                    ],
              { ...options, delay: Math.min(i * 12, 80) },
            ),
          ),
        );
      else
        animations.push(
          heading.animate(
            variant === "about"
              ? [
                  {
                    transform: "translateX(-24px)",
                    opacity: 0.2,
                    clipPath: "inset(0 20% 0 0)",
                  },
                  {
                    transform: "translateX(0)",
                    opacity: 1,
                    clipPath: "inset(0 0% 0 0)",
                  },
                ]
              : variant === "portfolio"
                ? [
                    { transform: "scale(.97)", clipPath: "inset(0 0 80% 0)" },
                    { transform: "scale(1)", clipPath: "inset(0 0 0% 0)" },
                  ]
                : [
                    {
                      transform: "translateY(22px) scale(1.025)",
                      opacity: 0.2,
                      clipPath: "inset(0 0 100% 0)",
                    },
                    {
                      transform: "translateY(0) scale(1)",
                      opacity: 1,
                      clipPath: "inset(0 0 0% 0)",
                    },
                  ],
            { ...options, delay: 30 },
          ),
        );
    }
    const description = ref.current.querySelector("p");
    if (description)
      animations.push(
        description.animate(
          [
            { opacity: 0.1, transform: "translateY(15px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { ...options, delay: 80, duration: 400 },
        ),
      );
    return () => animations.forEach((animation) => animation.cancel());
  }, [variant, reduced]);
  return (
    <div
      ref={ref}
      className={`banner-motion banner-${variant}`}
      data-motion-active={visible}
    >
      <span className="crystal-light" aria-hidden="true" />
      <div className="banner-art" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="banner-content">{children}</div>
    </div>
  );
}
