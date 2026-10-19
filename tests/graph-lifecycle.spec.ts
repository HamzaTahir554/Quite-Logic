import { test, expect } from "@playwright/test";
import { createGraphRenderer } from "../components/background/graph-renderer";
import { graphGeometry } from "../components/background/graph-geometry";

test("graph connections stay local and never exceed three per node", () => {
  for (const width of [375, 768, 1366, 1920]) {
    const { nodes, edges } = graphGeometry(width, 950);
    const degree = new Uint8Array(nodes.length);
    for (const { a, b } of edges) {
      degree[a]++;
      degree[b]++;
      expect(
        Math.hypot(
          (nodes[a].u - nodes[b].u) * width,
          (nodes[a].v - nodes[b].v) * 950,
        ),
      ).toBeLessThanOrEqual(320);
    }
    expect(Math.max(...degree)).toBeLessThanOrEqual(3);
    expect(edges.length).toBeGreaterThan(nodes.length / 2);
  }
});

test("graph renderer releases frames, observers, listeners and bitmap memory on disposal", () => {
  class Target extends EventTarget {
    listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    override addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean,
    ) {
      if (listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type)!.add(listener);
      }
      super.addEventListener(type, listener, options);
    }
    override removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean,
    ) {
      if (listener) this.listeners.get(type)?.delete(listener);
      super.removeEventListener(type, listener, options);
    }
    get count() {
      return [...this.listeners.values()].reduce(
        (sum, value) => sum + value.size,
        0,
      );
    }
  }
  const win = Object.assign(new Target(), { devicePixelRatio: 3, scrollY: 0 });
  const doc = Object.assign(new Target(), { hidden: false });
  const media = [
    Object.assign(new Target(), { matches: false }),
    Object.assign(new Target(), { matches: false }),
    Object.assign(new Target(), { matches: true }),
  ];
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0,
    draws = 0,
    observing = false;
  const context = new Proxy(
    {
      clearRect: () => {
        draws++;
      },
    },
    {
      get: (target, key) =>
        Reflect.has(target, key) ? Reflect.get(target, key) : () => {},
    },
  );
  const canvas = Object.assign(new Target(), {
    width: 0,
    height: 0,
    getContext: () => context,
  });
  const host = {
    dataset: { variant: "public" } as Record<string, string>,
    getBoundingClientRect: () => ({ width: 1366, height: 950 }),
  };
  const globals = {
    window: win,
    document: doc,
    matchMedia: (query: string) =>
      media[query.includes("reduced") ? 0 : query.includes("coarse") ? 1 : 2],
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    ResizeObserver: class {
      observe() {
        observing = true;
      }
      disconnect() {
        observing = false;
      }
    },
  };
  const previous = Object.fromEntries(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  try {
    const renderer = createGraphRenderer(
      canvas as unknown as HTMLCanvasElement,
      host as unknown as HTMLElement,
    );
    expect(observing).toBe(true);
    expect(frames.size).toBe(1);
    for (const type of [
      "pointermove",
      "mousemove",
      "pointerout",
      "scroll",
      "blur",
    ])
      expect(win.listeners.has(type)).toBe(false);
    renderer.setVariant("admin");
    expect(host.dataset.intensity).toBe("0.5");
    expect(frames.size).toBe(1);
    let stamp = 0;
    const advance = (delta: number) => {
      stamp += delta;
      for (const [id, callback] of [...frames]) {
        frames.delete(id);
        callback(stamp);
      }
    };
    const beforeLoad = draws;
    for (let index = 0; index < 32; index++) advance(80);
    expect(host.dataset.frameBudget).toBe("reduced");
    expect(draws - beforeLoad).toBeLessThan(32);
    for (let index = 0; index < 20; index++) advance(16.7);
    expect(host.dataset.frameBudget).toBe("balanced");
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(0);
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(1);
    media[0].matches = true;
    media[0].dispatchEvent(new Event("change"));
    expect(frames.size).toBe(0);
    expect(host.dataset.graphState).toBe("static");
    media[0].matches = false;
    media[0].dispatchEvent(new Event("change"));
    win.dispatchEvent(new Event("resize"));
    expect(frames.size).toBe(2); // Animation and a pending resize must both be cancelled.
    renderer.dispose();
    expect(frames.size).toBe(0);
    expect(observing).toBe(false);
    expect(
      [win, doc, canvas, ...media].every((target) => target.count === 0),
    ).toBe(true);
    expect([canvas.width, canvas.height]).toEqual([1, 1]);
    const finalDraws = draws;
    win.dispatchEvent(new Event("resize"));
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(0);
    expect(draws).toBe(finalDraws);
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
