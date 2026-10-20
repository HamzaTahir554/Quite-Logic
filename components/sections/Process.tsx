"use client";
import Arrow from "@/components/ui/Arrow";
import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useMotionValueEvent,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { process } from "@/data/content";
import { SectionHeading } from "@/components/ui/Elements";
export default function Process({ detailed = false }: { detailed?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({
    target: root,
    offset: ["start 60%", "end 65%"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });
  const rotation = useTransform(scrollYProgress, [0, 1], [0, 180]);
  useMotionValueEvent(scrollYProgress, "change", (value) =>
    setStage(Math.min(5, Math.floor(value * 6))),
  );
  return (
    <section
      className={`section container ${detailed ? "workflow-section" : ""}`}
    >
      <SectionHeading
        number="04"
        label="How we work"
        title="A clear path."
        accent="From idea to impact."
        description="A collaborative process, with the right questions at every step."
      />
      <div className={detailed ? "workflow-layout" : ""}>
        {detailed && (
          <aside className="workflow-visual">
            <div className="workflow-caption">
              <span>FROM IDEA TO PRODUCTION</span>
              <span>0{stage + 1} / 06</span>
            </div>
            <div className="pipeline-diagram" aria-hidden="true">
              <motion.div
                className="pipeline-rings"
                style={{ rotate: reduced ? 0 : rotation }}
              >
                <i />
                <i />
                <i />
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage}
                  className="pipeline-core"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3 }}
                >
                  <span>0{stage + 1}</span>
                  <small>{process[stage][0]}</small>
                </motion.div>
              </AnimatePresence>
              {process.map(([name], i) => (
                <span
                  key={name}
                  className={`pipeline-node ${i <= stage ? "complete" : ""}`}
                  style={{
                    transform: `rotate(${i * 60}deg) translateY(-125px) rotate(${-i * 60}deg)`,
                  }}
                >
                  0{i + 1}
                </span>
              ))}
            </div>
            <div className="workflow-now" aria-live="off">
              <span className="overline">Current focus</span>
              <h3>{process[stage][1]}</h3>
            </div>
            <div className="pipeline-progress">
              {process.map(([name], i) => (
                <i key={name} className={i <= stage ? "complete" : ""} />
              ))}
            </div>
          </aside>
        )}
        <div className="process" ref={root}>
          <div className="process-track">
            <motion.div style={{ scaleY: reduced ? 1 : scaleY }} />
          </div>
          {process.map(([name, subtitle, description], i) => (
            <motion.article
              key={name}
              className={`process-step ${i === stage ? "active" : ""} ${i < stage ? "complete" : ""}`}
              initial={false}
              onViewportEnter={(entry) => {
                if (entry && !reduced)
                  entry.target.querySelector("h3")?.animate(
                    [
                      {
                        clipPath: "inset(0 0 100% 0)",
                        transform: "translateY(18px)",
                      },
                      {
                        clipPath: "inset(0 0 0% 0)",
                        transform: "translateY(0)",
                      },
                    ],
                    { duration: 400 },
                  );
              }}
            >
              <span className="process-dot">0{i + 1}</span>
              <h3>{name}</h3>
              <div>
                <h4>{subtitle}</h4>
                {detailed && <p>{description}</p>}
              </div>
              <Arrow className="process-arrow" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
