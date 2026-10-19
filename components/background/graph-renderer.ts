import { graphGeometry } from "./graph-geometry";
import { graphPalettes, palettes, type VisualTheme } from "@/theme/tokens";
import {
  GraphConnections,
  connectionOpacity,
  connectionProgress,
  connectionSignal,
} from "./graph-connections";

export type GraphVariant = "public" | "admin" | "auth";
type GraphRenderer = {
  setVariant: (variant: GraphVariant) => void;
  setTheme: (theme: VisualTheme) => void;
  dispose: () => void;
};
const intensity = { public: 1, admin: 0.5, auth: 0.85 };
const tau = Math.PI * 2;

/** Canvas owns animation state; React is never updated by a frame or input event. */
export function createGraphRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
): GraphRenderer {
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  } catch {
    /* Optional decoration. */
  }
  if (!context) {
    host.dataset.graphState = "unavailable";
    return { setVariant: () => {}, setTheme: () => {}, dispose: () => {} };
  }
  const ctx = context;
  let theme: VisualTheme =
    document.documentElement?.dataset.theme === "day" ? "day" : "night";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)");
  let variant: GraphVariant =
    host.dataset.variant === "admin"
      ? "admin"
      : host.dataset.variant === "auth"
        ? "auth"
        : "public";
  let width = 1,
    height = 1,
    dpr = 1;
  let graph = graphGeometry(1, 1);
  let connections = new GraphConnections(graph.candidates, graph.nodes.length);
  let positions = new Float32Array(graph.nodes.length * 2);
  let frame = 0,
    resizeFrame = 0,
    lastFrame = 0,
    elapsed = 0;
  let disposed = false,
    lost = false;
  let lastTick = 0,
    pressure = 0,
    underLoad = false,
    skipPaint = false;
  const compact = () => width <= 600 || coarse.matches;

  function state(value: string) {
    host.dataset.graphState = value;
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    lastTick = 0;
    pressure = 0;
    underLoad = false;
    skipPaint = false;
    if (host.dataset.frameBudget !== "balanced")
      host.dataset.frameBudget = "balanced";
  }
  function draw() {
    const still = reduced.matches;
    const quiet = compact();
    const strength = intensity[variant];
    const mobileDay = theme === "day" && width <= 600;
    const colors = mobileDay ? graphPalettes.dayMobile : graphPalettes[theme];
    // Preserve the autonomous solver and its phase on theme changes; draw a
    // slightly sparser subset on Day mobile, rather than restarting the graph.
    const visible = (index: number) => !mobileDay || index % 11 !== 10;
    const nodeCount =
      graph.nodes.length -
      (mobileDay ? Math.floor(graph.nodes.length / 11) : 0);
    if (host.dataset.nodes !== String(nodeCount))
      host.dataset.nodes = String(nodeCount);
    const depthY = Math.sin(elapsed * 0.06) * 2;
    if (mobileDay) {
      // An opaque light paint avoids transparent canvas/backdrop compositing
      // artifacts on mobile. The graph remains the same persistent canvas.
      ctx.fillStyle = palettes.day.background;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.lineWidth = 0.8;

    // Faint open architectural arcs, with no filled regions or animated filters.
    const arcCount = quiet ? 2 : 3;
    for (let index = 0; index < arcCount; index++) {
      const phase = elapsed * 0.014 + index * 2.1;
      ctx.save();
      ctx.translate(
        width * (index === 1 ? 1.05 : 0.12 + index * 0.31) +
          Math.sin(phase) * 4,
        height * (index === 1 ? 0.32 : 0.75) +
          Math.cos(phase) * 4 -
          depthY * 0.4,
      );
      ctx.rotate(0.18 + Math.sin(phase) * 0.015);
      ctx.strokeStyle = index === 1 ? colors.arc : colors.quietArc;
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        Math.max(width * 0.42, 230),
        Math.max(height * 0.62, 240),
        0,
        0.18,
        Math.PI * 1.78,
      );
      ctx.stroke();
      ctx.restore();
    }

    for (let index = 0; index < graph.nodes.length; index++) {
      const node = graph.nodes[index];
      const phase = (elapsed / node.period) * tau + node.phase;
      const x = node.u * width + Math.sin(phase) * node.amplitude;
      const y =
        node.v * height +
        Math.cos(phase * 0.87) * node.amplitude -
        depthY * node.depth;
      positions[index * 2] = x;
      positions[index * 2 + 1] = y;
    }

    if (!still && connections.advance(elapsed, positions, graph.threshold))
      host.dataset.edges = String(connections.active.length);
    for (const edge of connections.active) {
      if (!visible(edge.a) || !visible(edge.b)) continue;
      const ax = positions[edge.a * 2],
        ay = positions[edge.a * 2 + 1];
      const bx = positions[edge.b * 2],
        by = positions[edge.b * 2 + 1];
      const progress = connectionProgress(edge, elapsed);
      ctx.globalAlpha = strength * connectionOpacity(edge, elapsed);
      ctx.strokeStyle = edge.blue
        ? colors.active
        : edge.id % 4 === 0
          ? colors.fine
          : colors.line;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (bx - ax) * progress, ay + (by - ay) * progress);
      ctx.stroke();
    }

    // At most three slow, fading data signals (one on compact/touch screens).
    if (!still)
      for (const edge of connections.active) {
        if (!visible(edge.a) || !visible(edge.b)) continue;
        const progress = connectionSignal(edge, elapsed);
        if (progress < 0) continue;
        const x =
          positions[edge.a * 2] +
          (positions[edge.b * 2] - positions[edge.a * 2]) * progress;
        const y =
          positions[edge.a * 2 + 1] +
          (positions[edge.b * 2 + 1] - positions[edge.a * 2 + 1]) * progress;
        ctx.globalAlpha =
          strength * Math.sin(progress * Math.PI) * (quiet ? 0.28 : 0.48);
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, tau);
        ctx.fill();
      }

    for (let index = 0; index < graph.nodes.length; index++) {
      if (!visible(index)) continue;
      const x = positions[index * 2],
        y = positions[index * 2 + 1];
      const active = index % 11 === 0;
      ctx.globalAlpha = strength * (active ? 0.42 : 1);
      ctx.fillStyle = active ? colors.accent : colors.node;
      ctx.beginPath();
      ctx.arc(x, y, active ? 1.75 : 1.15, 0, tau);
      ctx.fill();
      const cycle = (elapsed + graph.nodes[index].phase * 9) % 44;
      if (active && !still && cycle < 6) {
        const progress = cycle / 6;
        ctx.globalAlpha =
          strength * Math.sin(progress * Math.PI) * (quiet ? 0.1 : 0.2);
        ctx.strokeStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(x, y, 3 + progress * 6, 0, tau);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || lost || document.hidden || reduced.matches) return;
    // Yield decorative paints under sustained page/compositor load. This keeps
    // native scrolling and existing UI animation ahead of background redraws.
    if (lastTick) {
      const gap = now - lastTick;
      pressure = Math.max(0, Math.min(12, pressure + (gap > 40 ? 1 : -2)));
      const next = pressure >= 8 ? true : pressure <= 2 ? false : underLoad;
      if (next !== underLoad) {
        underLoad = next;
        host.dataset.frameBudget = underLoad ? "reduced" : "balanced";
      }
    }
    lastTick = now;
    skipPaint = underLoad && !skipPaint;
    if (skipPaint) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const interval = compact() ? 1000 / 30 : 1000 / 60;
    if (!lastFrame || now - lastFrame >= interval - 0.5) {
      const delta = lastFrame ? Math.min(now - lastFrame, 250) : interval;
      lastFrame = now;
      elapsed += (delta / 1000) * (compact() ? 0.65 : 1);
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function resume() {
    stop();
    if (disposed || lost) return;
    if (document.hidden) {
      state("paused");
      return;
    }
    if (reduced.matches) {
      draw();
      state("static");
      return;
    }
    state("running");
    frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (disposed || lost) return;
    const rect = host.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const nextDpr =
      coarse.matches || nextWidth <= 600
        ? 1
        : Math.min(window.devicePixelRatio || 1, 1.5);
    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth;
      height = nextHeight;
      graph = graphGeometry(width, height);
      connections = new GraphConnections(
        graph.candidates,
        graph.nodes.length,
        elapsed,
        compact() ? 1 : 3,
      );
      positions = new Float32Array(graph.nodes.length * 2);
    }
    dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    host.dataset.nodes = String(graph.nodes.length);
    host.dataset.edges = String(connections.active.length);
    host.dataset.dpr = String(dpr);
    host.dataset.frameRate = compact() ? "30" : "60";
    if (!document.hidden) draw();
    resume();
  }
  function scheduleResize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  }
  function mediaChange() {
    resize();
  }
  function visibility() {
    resume();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    stop();
    state("unavailable");
  }
  function contextRestored() {
    lost = false;
    resize();
  }
  const observer = new ResizeObserver(scheduleResize);
  observer.observe(host);
  window.addEventListener("resize", scheduleResize, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("contextlost", contextLost);
  canvas.addEventListener("contextrestored", contextRestored);
  for (const media of [reduced, coarse])
    media.addEventListener("change", mediaChange);
  resize();

  return {
    setTheme(next: VisualTheme) {
      theme = next;
      host.dataset.theme = next;
      if (!disposed && !lost && !document.hidden) draw();
    },
    setVariant(next: GraphVariant) {
      variant = next;
      host.dataset.intensity = String(intensity[variant]);
      if (!disposed && !lost && !document.hidden) draw();
    },
    dispose() {
      disposed = true;
      stop();
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleResize);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("contextlost", contextLost);
      canvas.removeEventListener("contextrestored", contextRestored);
      for (const media of [reduced, coarse])
        media.removeEventListener("change", mediaChange);
      canvas.width = canvas.height = 1;
    },
  };
}
