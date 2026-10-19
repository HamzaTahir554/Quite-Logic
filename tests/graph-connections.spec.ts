import assert from "node:assert/strict";
import { test, expect } from "@playwright/test";
import { graphGeometry } from "../components/background/graph-geometry";
import {
  GraphConnections,
  connectionOpacity,
  connectionProgress,
  connectionSignal,
} from "../components/background/graph-connections";

test("connections smoothly draw, hold and fade with staggered calm timings", () => {
  const graph = graphGeometry(1366, 950);
  const loop = new GraphConnections(graph.candidates, graph.nodes.length);
  for (const edge of loop.active) {
    expect(edge.fadeIn).toBeGreaterThanOrEqual(0.8);
    expect(edge.fadeIn).toBeLessThanOrEqual(1.5);
    expect(edge.hold).toBeGreaterThanOrEqual(2);
    expect(edge.hold).toBeLessThanOrEqual(6);
    expect(edge.fadeOut).toBeGreaterThanOrEqual(0.8);
    expect(edge.fadeOut).toBeLessThanOrEqual(1.5);
    expect(connectionOpacity(edge, edge.started)).toBe(0);
    expect(connectionProgress(edge, edge.started)).toBe(0);
    expect(connectionOpacity(edge, edge.started + edge.fadeIn)).toBeCloseTo(1);
    expect(connectionProgress(edge, edge.started + edge.fadeIn)).toBe(1);
    expect(
      connectionOpacity(edge, edge.started + edge.fadeIn + edge.hold / 2),
    ).toBe(1);
    expect(connectionOpacity(edge, edge.ends)).toBe(0);
    expect(connectionOpacity(edge, edge.ends - 0.001)).toBeLessThan(0.00001);
    expect(connectionOpacity(edge, edge.started + 0.001)).toBeLessThan(0.00001);
  }
  expect(new Set(loop.active.map((edge) => edge.started)).size).toBeGreaterThan(
    10,
  );
});

test("the idle network continuously rotates nearby partners without exceeding connection or signal limits", () => {
  for (const width of [375, 768, 1366, 1920]) {
    const graph = graphGeometry(width, 950);
    const signalLimit = width <= 600 ? 1 : 3;
    const loop = new GraphConnections(
      graph.candidates,
      graph.nodes.length,
      0,
      signalLimit,
    );
    const initial = new Set(loop.active.map((edge) => `${edge.a}:${edge.b}`));
    const seen = new Set(initial);
    const positions = new Float32Array(graph.nodes.length * 2);
    let departures = 0,
      arrivals = 0,
      signalSamples = 0;
    const ids = new Set(loop.active.map((edge) => edge.id));
    for (let step = 0; step <= 1200; step++) {
      const time = step / 10;
      for (const [index, node] of graph.nodes.entries()) {
        const phase = (time / node.period) * Math.PI * 2 + node.phase;
        positions[index * 2] =
          node.u * width + Math.sin(phase) * node.amplitude;
        positions[index * 2 + 1] =
          node.v * 950 +
          Math.cos(phase * 0.87) * node.amplitude -
          Math.sin(time * 0.06) * 2 * node.depth;
      }
      loop.advance(time, positions, graph.threshold);
      const degree = new Uint8Array(graph.nodes.length);
      let signals = 0;
      const activeIds = new Set<number>();
      for (const edge of loop.active) {
        assert.ok(
          ++degree[edge.a] <= 3 && ++degree[edge.b] <= 3,
          "At most three active/fading connections per node",
        );
        assert.ok(
          Math.hypot(
            positions[edge.a * 2] - positions[edge.b * 2],
            positions[edge.a * 2 + 1] - positions[edge.b * 2 + 1],
          ) <= graph.threshold,
          "Connections remain within the local distance threshold throughout drift",
        );
        const opacity = connectionOpacity(edge, time);
        assert.ok(opacity >= 0 && opacity <= 1);
        seen.add(`${edge.a}:${edge.b}`);
        activeIds.add(edge.id);
        if (!ids.has(edge.id)) arrivals++;
        const progress = connectionSignal(edge, time);
        if (progress > 0 && progress < 1) {
          signals++;
          assert.equal(
            connectionProgress(edge, time),
            1,
            "Signals run only along fully connected edges",
          );
          assert.equal(opacity, 1, "Signals finish before disconnection");
        }
      }
      assert.ok(signals <= signalLimit);
      signalSamples += signals;
      for (const id of ids) if (!activeIds.has(id)) departures++;
      ids.clear();
      for (const id of activeIds) ids.add(id);
      assert.ok(
        loop.active.length > 0,
        "The network never globally restarts or goes empty",
      );
    }
    expect(seen.size).toBeGreaterThan(initial.size * 1.5);
    expect(arrivals).toBeGreaterThan(graph.nodes.length);
    expect(departures).toBeGreaterThan(graph.nodes.length);
    expect(signalSamples).toBeGreaterThan(0);
    expect(
      graph.nodes.every((node) => node.period >= 8 && node.period <= 20),
    ).toBe(true);
  }
});
