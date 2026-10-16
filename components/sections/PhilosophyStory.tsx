"use client";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
const words = ["CALM", "PRECISE", "USEFUL", "RELIABLE"];
export default function PhilosophyStory() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["8%", "-20%"]);
  const reverse = useTransform(scrollYProgress, [0, 1], ["-20%", "8%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-25, 45]);
  return (
    <section
      ref={ref}
      className="philosophy-story container"
      aria-label="Our philosophy in four words"
    >
      <div className="story-type" aria-hidden="true">
        <motion.span style={{ x: reduced ? 0 : x }}>CALM / PRECISE</motion.span>
        <motion.span style={{ x: reduced ? 0 : reverse }}>
          USEFUL / RELIABLE
        </motion.span>
      </div>
      <div className="story-content">
        <span className="overline">The way we think shapes what we make.</span>
        <h2>
          Every detail has a purpose.
          <br />
          <em>Every decision, a reason.</em>
        </h2>
        <div className="story-principles">
          {words.map((word, i) => (
            <motion.span
              key={word}
              initial={false}
              whileInView={{ opacity: 1 }}
              onViewportEnter={(entry) => {
                if (entry && !reduced)
                  entry.target.animate(
                    [
                      { transform: "translateY(25px)", opacity: 0 },
                      { transform: "translateY(0)", opacity: 1 },
                    ],
                    {
                      duration: 400,
                      delay: Math.min(i * 20, 80),
                      fill: "backwards",
                    },
                  );
              }}
            >
              <b>0{i + 1}</b>
              {word}
            </motion.span>
          ))}
        </div>
      </div>
      <motion.div
        className="philosophy-geometry"
        style={{ rotate: reduced ? 0 : rotate }}
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
      </motion.div>
    </section>
  );
}
