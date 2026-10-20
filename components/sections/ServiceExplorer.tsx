"use client";
import Arrow from "@/components/ui/Arrow";
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
import { serviceFaces } from "@/data/serviceFaces";
import SceneBoundary from "@/components/three/SceneBoundary";
import { useSceneActivity } from "@/hooks/useSceneActivity";
import MagneticLink from "@/components/motion/MagneticLink";
import BrandName from "@/components/ui/BrandName";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import type { MotionValue } from "framer-motion";
import { useCubeRotation } from "@/hooks/useCubeRotation";

const ServiceDice = dynamic(() => import("@/components/three/ServiceDice"), {
  ssr: false,
});

function CSSCube({
  rotation,
  tiltX,
  tiltY,
}: {
  rotation: ReturnType<typeof useCubeRotation>;
  tiltX: MotionValue<number> | number;
  tiltY: MotionValue<number> | number;
}) {
  return (
    <div className="css-cube-perspective" aria-hidden="true">
      <motion.div
        className="cube-pointer-tilt"
        style={{ rotateX: tiltX, rotateY: tiltY }}
      >
        <div className="css-cube-tilt">
          <div className="css-service-cube" ref={rotation.bind}>
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
                  <Arrow />
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
  const [selected, setSelected] = useState(5);
  const [presented, setPresented] = useState(5);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const markCanvasReady = useCallback(() => setCanvasReady(true), []);
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
  useEffect(() => {
    if (!webgl) setCanvasReady(false);
  }, [webgl]);

  const gesture = useRef<{
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    time: number;
    id: number;
    claimed: boolean;
  } | null>(null);
  const manualUntil = useRef(Infinity);
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

  const rotation = useCubeRotation(selected, reduced, choose, settled);
  useEffect(() => {
    if (active && manualUntil.current === Infinity)
      manualUntil.current = Date.now() + 3500;
  }, [active]);

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
    if (!active || hover || focus || dragging || reduced) return;
    const timer = setInterval(() => {
      if (Date.now() >= manualUntil.current)
        setSelected((index) => (index + 1) % 6);
    }, 8200);
    return () => clearInterval(timer);
  }, [active, hover, focus, dragging, reduced]);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    // Only the actual cube owns vertical touch gestures; its surrounding plane scrolls.
    if (
      event.pointerType === "touch" &&
      !(event.target as Element).closest(".css-cube-tilt")
    )
      return;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      time: event.timeStamp,
      id: event.pointerId,
      claimed: false,
    };
    manualUntil.current = Date.now() + 12000;
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (
      !current &&
      desktop &&
      !webgl &&
      !reduced &&
      event.pointerType === "mouse"
    ) {
      const bounds = event.currentTarget.getBoundingClientRect();
      mouseX.set(
        Math.max(
          -2,
          Math.min(
            2,
            -((event.clientY - bounds.top) / bounds.height - 0.5) * 4,
          ),
        ),
      );
      mouseY.set(
        Math.max(
          -2,
          Math.min(2, ((event.clientX - bounds.left) / bounds.width - 0.5) * 4),
        ),
      );
    }
    if (!current || current.id !== event.pointerId) return;
    if (!current.claimed) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8)
        return;
      current.claimed = true;
      rotation.begin();
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    rotation.drag(
      event.clientX - current.lastX,
      event.clientY - current.lastY,
      event.timeStamp - current.time,
    );
    current.lastX = event.clientX;
    current.lastY = event.clientY;
    current.time = event.timeStamp;
  }
  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (event.timeStamp - current.time > 100) rotation.drag(0, 0, 16);
    if (current.claimed) rotation.release(cancelled);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section
      className={`${embedded ? "" : "container "}service-explorer signature-explorer`}
      aria-label="Interactive service explorer"
      data-active-face={selected + 1}
      data-settled-face={presented + 1}
      data-renderer={webgl ? "webgl" : "css"}
      data-canvas-ready={webgl && canvasReady}
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
              rotation.release(true);
              setDragging(false);
            }
          }}
          onLostPointerCapture={(event) => {
            // A child canvas can release its implicit capture when the wrapper takes over.
            if (event.target !== event.currentTarget) return;
            if (!gesture.current) return;
            gesture.current = null;
            rotation.release(true);
            setDragging(false);
          }}
          aria-hidden="true"
        >
          {(!webgl || !canvasReady) && (
            <CSSCube rotation={rotation} tiltX={tiltX} tiltY={tiltY} />
          )}
          {webgl && (
            <div className="cube-webgl-layer" data-ready={canvasReady}>
              <SceneBoundary
                onError={() => {
                  setFailed(true);
                  choose(5);
                }}
              >
                <ServiceDice
                  active={active}
                  selected={selected}
                  onReady={markCanvasReady}
                  onSelect={choose}
                  onUnavailable={() => {
                    setFailed(true);
                    choose(5);
                  }}
                  orientation={rotation.orientation}
                  dragging={dragging}
                  hover={hover}
                />
              </SceneBoundary>
            </div>
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
              ? "Drag in any direction to turn."
              : "Drag the cube. Swipe beside it to scroll."}
          </span>
          <button
            aria-label="Next service"
            onClick={() => choose(selected + 1)}
          >
            →
          </button>
        </div>
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
              <Arrow />
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
