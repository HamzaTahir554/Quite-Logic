"use client";
import { useCallback, useEffect, useRef } from "react";
import {
  blend,
  cssRotation,
  cubeOrientations,
  multiply,
  nearestFace,
  turn,
  type Rotation,
} from "@/lib/cube-rotation";

/** One orientation/physics controller for both CSS and WebGL, with no frame state. */
export function useCubeRotation(
  selected: number,
  reduced: boolean,
  onSelect: (index: number) => void,
  onSettled: () => void,
) {
  const orientation = useRef<Rotation>([...cubeOrientations[selected]]);
  const element = useRef<HTMLDivElement | null>(null);
  const state = useRef({
    target: [...cubeOrientations[selected]] as Rotation,
    frame: 0,
    last: 0,
    dragging: false,
    inertia: false,
    vx: 0,
    vy: 0,
  });
  const callbacks = useRef({ onSelect, onSettled, reduced });
  callbacks.current = { onSelect, onSettled, reduced };
  const paint = useCallback(() => {
    if (element.current)
      element.current.style.transform = cssRotation(orientation.current);
  }, []);
  const bind = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      paint();
    },
    [paint],
  );
  const animate = useCallback(() => {
    const s = state.current;
    if (s.frame || document.hidden) return;
    s.last = performance.now();
    function frame(now: number) {
      s.frame = 0;
      const dt = Math.min((now - s.last) / 1000, 0.04);
      s.last = now;
      if (s.dragging) return;
      if (s.inertia) {
        orientation.current = multiply(
          turn(s.vx * dt, s.vy * dt),
          orientation.current,
        );
        s.vx *= Math.exp(-12 * dt);
        s.vy *= Math.exp(-12 * dt);
        if (Math.hypot(s.vx, s.vy) < 0.06) {
          s.inertia = false;
          const index = nearestFace(orientation.current);
          s.target = [...cubeOrientations[index]];
          callbacks.current.onSelect(index);
        }
      } else {
        orientation.current = blend(
          orientation.current,
          s.target,
          callbacks.current.reduced ? 1 : 1 - Math.exp(-8 * dt),
        );
      }
      paint();
      const similarity = Math.abs(
        orientation.current.reduce((sum, n, i) => sum + n * s.target[i], 0),
      );
      if (!s.inertia && similarity > 0.999995) {
        orientation.current = [...s.target];
        paint();
        callbacks.current.onSettled();
        return;
      }
      s.frame = requestAnimationFrame(frame);
    }
    s.frame = requestAnimationFrame(frame);
  }, [paint]);
  useEffect(() => {
    const s = state.current;
    // Explicit service selections always take priority over residual momentum.
    cancelAnimationFrame(s.frame);
    s.frame = 0;
    s.inertia = false;
    s.target = [...cubeOrientations[selected]];
    if (reduced) {
      orientation.current = [...s.target];
      paint();
      onSettled();
    } else if (!s.dragging && !s.inertia) animate();
  }, [selected, reduced, animate, paint, onSettled]);
  useEffect(() => {
    const currentState = state.current;
    const visibility = () => {
      const s = state.current;
      if (document.hidden) {
        cancelAnimationFrame(s.frame);
        s.frame = 0;
        s.inertia = false;
        s.dragging = false;
      } else animate();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(currentState.frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [animate]);
  function begin() {
    const s = state.current;
    cancelAnimationFrame(s.frame);
    s.frame = 0;
    s.dragging = true;
    s.inertia = false;
    s.vx = s.vy = 0;
  }
  function drag(dx: number, dy: number, milliseconds: number) {
    const s = state.current;
    orientation.current = multiply(
      turn(dy * 0.009, dx * 0.009),
      orientation.current,
    );
    const dt = Math.max(milliseconds, 16) / 1000;
    s.vx = Math.max(-1.2, Math.min(1.2, (dy * 0.009) / dt));
    s.vy = Math.max(-1.2, Math.min(1.2, (dx * 0.009) / dt));
    paint();
  }
  function release(cancelled = false) {
    const s = state.current;
    s.dragging = false;
    if (cancelled || callbacks.current.reduced) {
      const index = nearestFace(orientation.current);
      s.target = [...cubeOrientations[index]];
      callbacks.current.onSelect(index);
      if (callbacks.current.reduced) {
        orientation.current = [...s.target];
        paint();
        callbacks.current.onSettled();
        return;
      }
    } else s.inertia = true;
    animate();
  }
  return { orientation, bind, begin, drag, release };
}
