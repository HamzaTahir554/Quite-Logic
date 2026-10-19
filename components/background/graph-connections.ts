import type { GraphEdge } from "./graph-geometry";

export type LiveConnection = GraphEdge & {
  id: number;
  pair: number;
  started: number;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  ends: number;
  blue: boolean;
  signalStart: number;
  signalDuration: number;
};

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function connectionProgress(edge: LiveConnection, time: number) {
  return smooth((time - edge.started) / edge.fadeIn);
}

export function connectionOpacity(edge: LiveConnection, time: number) {
  const age = time - edge.started;
  if (age < edge.fadeIn) return smooth(age / edge.fadeIn);
  if (age < edge.fadeIn + edge.hold) return 1;
  return smooth((edge.ends - time) / edge.fadeOut);
}

export function connectionSignal(edge: LiveConnection, time: number) {
  if (time < edge.signalStart || time > edge.signalStart + edge.signalDuration)
    return -1;
  return (time - edge.signalStart) / edge.signalDuration;
}

/** A bounded scheduler; candidate pairs are computed only when the view resizes. */
export class GraphConnections {
  readonly active: LiveConnection[] = [];
  private readonly degree: Uint8Array;
  private readonly occupied: Uint8Array;
  private readonly cooldown: Float64Array;
  private readonly previousPartner: Int16Array;
  private readonly signalSlots: Float64Array;
  private readonly limit: number;
  private readonly batch: number;
  private seed = 23817;
  private serial = 0;
  private nextScan: number;

  constructor(
    private readonly candidates: GraphEdge[],
    nodeCount: number,
    time = 0,
    signalLimit = 3,
  ) {
    this.degree = new Uint8Array(nodeCount);
    this.occupied = new Uint8Array(candidates.length);
    this.cooldown = new Float64Array(candidates.length);
    this.previousPartner = new Int16Array(nodeCount).fill(-1);
    this.signalSlots = new Float64Array(signalLimit).fill(-Infinity);
    this.limit = Math.floor(nodeCount * 0.9);
    this.batch = nodeCount <= 25 ? 1 : 3;
    // Mixed initial ages avoid an empty graph or a synchronized first restart.
    for (let index = 0; index < Math.floor(this.limit * 0.75); index++) {
      if (!this.connect(time, true)) break;
    }
    this.nextScan = time + 0.35 + this.random() * 0.35;
  }

  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private connect(
    time: number,
    warm = false,
    positions?: Float32Array,
    threshold = Infinity,
  ) {
    let selected = -1,
      best = Infinity;
    for (let index = 0; index < this.candidates.length; index++) {
      const { a, b } = this.candidates[index];
      if (
        this.occupied[index] ||
        this.cooldown[index] > time ||
        this.degree[a] >= 3 ||
        this.degree[b] >= 3
      )
        continue;
      if (positions) {
        const dx = positions[a * 2] - positions[b * 2];
        const dy = positions[a * 2 + 1] - positions[b * 2 + 1];
        if (dx * dx + dy * dy > threshold * threshold) continue;
      }
      const repeat =
        this.previousPartner[a] === b || this.previousPartner[b] === a;
      const score =
        this.random() +
        (this.degree[a] + this.degree[b]) * 0.3 +
        (repeat ? 3 : 0);
      if (score < best) {
        best = score;
        selected = index;
      }
    }
    if (selected < 0) return false;
    const { a, b } = this.candidates[selected];
    const fadeIn = 0.8 + this.random() * 0.7;
    const hold = 2 + this.random() * 4;
    const fadeOut = 0.8 + this.random() * 0.7;
    const started = time - (warm ? this.random() * (fadeIn + hold * 0.8) : 0);
    const id = this.serial++;
    const signalDuration = Math.min(2.8, hold * 0.7);
    let signalStart = Infinity;
    if (id % 4 === 0) {
      const proposed =
        started +
        fadeIn +
        (hold - signalDuration) * (0.15 + this.random() * 0.7);
      const slot = this.signalSlots.findIndex((end) => end <= proposed);
      if (slot >= 0) {
        signalStart = proposed;
        this.signalSlots[slot] = proposed + signalDuration;
      }
    }
    this.active.push({
      a,
      b,
      pair: selected,
      id,
      started,
      fadeIn,
      hold,
      fadeOut,
      ends: started + fadeIn + hold + fadeOut,
      blue: id % 9 === 0,
      signalStart,
      signalDuration,
    });
    this.occupied[selected] = 1;
    this.degree[a]++;
    this.degree[b]++;
    return true;
  }

  advance(time: number, positions?: Float32Array, threshold = Infinity) {
    let changed = false;
    for (let index = this.active.length - 1; index >= 0; index--) {
      const edge = this.active[index];
      if (time < edge.ends) continue;
      this.degree[edge.a]--;
      this.degree[edge.b]--;
      this.occupied[edge.pair] = 0;
      this.cooldown[edge.pair] = time + 0.8 + this.random() * 2;
      this.previousPartner[edge.a] = edge.b;
      this.previousPartner[edge.b] = edge.a;
      this.active.splice(index, 1);
      changed = true;
    }
    if (time >= this.nextScan) {
      for (
        let index = 0;
        index < this.batch && this.active.length < this.limit;
        index++
      ) {
        if (!this.connect(time, false, positions, threshold)) break;
        changed = true;
      }
      this.nextScan = time + 0.35 + this.random() * 0.35;
    }
    return changed;
  }
}
