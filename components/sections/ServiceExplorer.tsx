"use client";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "framer-motion";
import useMediaQuery from "@mui/material/useMediaQuery";
import { serviceFaces, faceRotations } from "@/data/serviceFaces";
import SceneBoundary from "@/components/three/SceneBoundary";
import { useSceneActivity } from "@/hooks/useSceneActivity";
import MagneticLink from "@/components/motion/MagneticLink";
import BrandName from "@/components/ui/BrandName";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import type { MotionValue } from "framer-motion";

const ServiceDice = dynamic(() => import("@/components/three/ServiceDice"), {
  ssr: false,
});

function CSSCube({
  selected,
  onSettled,
  tiltX,
  tiltY,
}: {
  selected: number;
  onSettled: () => void;
  tiltX: MotionValue<number> | number;
  tiltY: MotionValue<number> | number;
}) {
  const [x, y] = faceRotations[selected];
  return (
    <div className="css-cube-perspective" aria-hidden="true">
      <motion.div
        className="cube-pointer-tilt"
        style={{ rotateX: tiltX, rotateY: tiltY }}
      >
        <div className="css-cube-tilt">
          <div
            className="css-service-cube"
            style={{ transform: `rotateX(${-x}rad) rotateY(${y}rad)` }}
            onTransitionEnd={onSettled}
          >
            {serviceFaces.map((face, index) => (
              <div className={`cube-face cube-face-${index}`} key={face.slug}>
                <div className="cube-face-top">
                  <span className="cube-face-icon">{face.icon}</span>
                  <span>0{index + 1}</span>
                </div>
                <span className="cube-face-kicker">
                  SOFTWARE STUDIO / CAPABILITIES
                </span>
                <strong>{index === 5 ? <BrandName /> : face.short}</strong>
                <p>{face.description}</p>
                <span className="cube-face-bottom">
                  {index === 5
                    ? "Explore all services"
                    : "Thoughtfully engineered"}
                  <span>↗</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ServiceExplorer({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [presented, setPresented] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const desktop = useMediaQuery("(min-width: 901px) and (pointer: fine)");
  const { ref, enabled, active } = useSceneActivity(desktop);
  const reduced = useMotionPreference();
  const mouseX = useMotionValue(0),
    mouseY = useMotionValue(0);
  const mx = useSpring(mouseX, { stiffness: 90, damping: 23 });
  const my = useSpring(mouseY, { stiffness: 90, damping: 23 });
  const tiltX = desktop && active && !reduced ? mx : 0;
  const tiltY = desktop && active && !reduced ? my : 0;
  const webgl = desktop && enabled && !failed;
  const drag = useMotionValue(0);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const manualUntil = useRef(0);
  const current = useRef(selected);
  current.current = selected;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.15"],
  });
  const service = serviceFaces[presented];
  const choose = useCallback((index: number) => {
    manualUntil.current = Date.now() + 12000;
    setSelected((index + serviceFaces.length) % serviceFaces.length);
  }, []);
  const settled = useCallback(() => setPresented(current.current), []);

  useEffect(() => {
    if (reduced) {
      setPresented(selected);
      return;
    }
    if (webgl) return;
    // Also settles if the fallback mounts already in the requested orientation.
    const timer = setTimeout(settled, 370);
    return () => clearTimeout(timer);
  }, [selected, webgl, reduced, settled]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (
      !desktop ||
      !active ||
      reduced ||
      dragging ||
      Date.now() < manualUntil.current
    )
      return;
    setSelected(Math.min(4, Math.floor(progress * 5)));
  });

  useEffect(() => {
    if (!active || paused || hover || focus || dragging || reduced) return;
    const timer = setInterval(() => {
      if (Date.now() >= manualUntil.current)
        setSelected((index) => (index + 1) % 6);
    }, 8200);
    return () => clearInterval(timer);
  }, [active, paused, hover, focus, dragging, reduced]);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
    };
    manualUntil.current = Date.now() + 12000;
    setDragging(true);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      desktop &&
      !webgl &&
      event.pointerType === "mouse" &&
      !reduced &&
      !dragging
    ) {
      const bounds = event.currentTarget.getBoundingClientRect();
      mouseX.set(
        Math.max(
          -3,
          Math.min(
            3,
            -((event.clientY - bounds.top) / bounds.height - 0.5) * 6,
          ),
        ),
      );
      mouseY.set(
        Math.max(
          -3,
          Math.min(3, ((event.clientX - bounds.left) / bounds.width - 0.5) * 6),
        ),
      );
    }
    if (!gesture.current || gesture.current.id !== event.pointerId || reduced)
      return;
    if (
      Math.abs(event.clientX - gesture.current.x) > 10 &&
      Math.abs(event.clientX - gesture.current.x) >
        Math.abs(event.clientY - gesture.current.y) &&
      !event.currentTarget.hasPointerCapture(event.pointerId)
    )
      event.currentTarget.setPointerCapture(event.pointerId);
    const amount = Math.max(
      -1,
      Math.min(1, (event.clientX - gesture.current.x) / 180),
    );
    drag.set(amount);
    event.currentTarget.style.setProperty("--drag-angle", `${amount * 24}deg`);
  }
  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    drag.set(0);
    event.currentTarget.style.setProperty("--drag-angle", "0deg");
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!cancelled && Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy))
      choose(selected + (dx < 0 ? 1 : -1));
  }

  return (
    <section
      className={`${embedded ? "" : "container "}service-explorer signature-explorer`}
      aria-label="Interactive service explorer"
      data-active-face={selected + 1}
      data-settled-face={presented + 1}
      data-renderer={webgl ? "webgl" : "css"}
      data-motion-active={active}
      onFocusCapture={() => setFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
      }}
    >
      <div className="explorer-visual" ref={ref}>
        <div className="explorer-label">
          <span>ONE STUDIO / SIX PERSPECTIVES</span>
          <span>0{selected + 1} — 06</span>
        </div>
        <div className="cube-orbit orbit-a" aria-hidden="true" />
        <div className="cube-orbit orbit-b" aria-hidden="true" />
        <div className="cube-shadow" aria-hidden="true" />
        <div
          className="cube-interaction"
          data-dragging={dragging}
          data-cursor="DRAG"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={(event) => finish(event, true)}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHover(true);
          }}
          onPointerLeave={(event) => {
            mouseX.set(0);
            mouseY.set(0);
            setHover(false);
            const currentGesture = gesture.current;
            if (
              currentGesture &&
              !event.currentTarget.hasPointerCapture(currentGesture.id)
            ) {
              gesture.current = null;
              drag.set(0);
              event.currentTarget.style.setProperty("--drag-angle", "0deg");
              setDragging(false);
            }
          }}
          onLostPointerCapture={(event) => {
            // A child canvas can release its implicit capture when the wrapper takes over.
            if (event.target !== event.currentTarget) return;
            if (!gesture.current) return;
            gesture.current = null;
            drag.set(0);
            event.currentTarget.style.setProperty("--drag-angle", "0deg");
            setDragging(false);
          }}
          aria-hidden="true"
        >
          {webgl ? (
            <SceneBoundary
              onError={() => setFailed(true)}
              fallback={
                <CSSCube
                  selected={selected}
                  onSettled={settled}
                  tiltX={tiltX}
                  tiltY={tiltY}
                />
              }
            >
              <ServiceDice
                active={active}
                selected={selected}
                onSelect={choose}
                onSettled={settled}
                onUnavailable={() => setFailed(true)}
                drag={drag}
                dragging={dragging}
                hover={hover}
              />
            </SceneBoundary>
          ) : (
            <CSSCube
              selected={selected}
              onSettled={settled}
              tiltX={tiltX}
              tiltY={tiltY}
            />
          )}
        </div>
        <div className="cube-controls">
          <button
            aria-label="Previous service"
            onClick={() => choose(selected - 1)}
          >
            ←
          </button>
          <span className="explorer-hint">
            {desktop
              ? "Drag to turn. Scroll to discover."
              : "Swipe to discover a different side."}
          </span>
          <button
            aria-label="Next service"
            onClick={() => choose(selected + 1)}
          >
            →
          </button>
        </div>
        {hydrated && !reduced && (
          <button
            className="cube-autoplay"
            onClick={() => {
              setPaused(!paused);
              setFocus(false);
              if (paused) manualUntil.current = 0;
            }}
            aria-pressed={paused}
            aria-label={
              paused
                ? "Play automatic service rotation"
                : "Pause automatic service rotation"
            }
          >
            {paused ? "▶ Play rotation" : "Ⅱ Pause rotation"}
          </button>
        )}
      </div>
      <div className="explorer-information">
        <span className="overline">Different sides. Shared precision.</span>
        <div
          className="service-selector"
          role="group"
          aria-label="Choose a service"
        >
          {serviceFaces.map((face, index) => (
            <button
              key={face.slug}
              onClick={() => choose(index)}
              aria-pressed={selected === index}
              aria-controls={
                embedded ? "home-service-description" : "service-description"
              }
            >
              <span>0{index + 1}</span>
              {face.short}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
        <div
          className="explorer-description"
          id={embedded ? "home-service-description" : "service-description"}
          aria-live={focus ? "polite" : "off"}
          aria-atomic="true"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={service.slug}
              className="explorer-selection"
              initial={reduced ? false : "hidden"}
              animate="shown"
              exit={reduced ? undefined : { opacity: 0, y: -5 }}
              variants={{
                hidden: { opacity: 0 },
                shown: { opacity: 1, transition: { staggerChildren: 0.02 } },
              }}
              transition={{ duration: reduced ? 0 : 0.15 }}
            >
              <motion.span
                className="explorer-service-icon"
                aria-hidden="true"
                variants={{
                  hidden: { opacity: 0, scale: 0.8, rotate: -10 },
                  shown: { opacity: 1, scale: 1, rotate: 0 },
                }}
              >
                {service.icon}
              </motion.span>
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: 9 },
                  shown: { opacity: 1, y: 0 },
                }}
              >
                {presented === 5 ? <BrandName /> : service.name}
              </motion.h2>
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 9 },
                  shown: { opacity: 1, y: 0 },
                }}
              >
                {service.description}
              </motion.p>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 7 },
                  shown: { opacity: 1, y: 0 },
                }}
              >
                <MagneticLink
                  href={
                    presented === 5
                      ? embedded
                        ? "/services"
                        : "#web-development"
                      : `${embedded ? "/services" : ""}#${service.slug}`
                  }
                  secondary
                >
                  {presented === 5
                    ? "Explore all services"
                    : "Explore this discipline"}
                </MagneticLink>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
