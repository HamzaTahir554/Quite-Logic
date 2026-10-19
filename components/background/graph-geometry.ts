export type GraphNode = {
  u: number;
  v: number;
  phase: number;
  amplitude: number;
  period: number;
  depth: number;
};
export type GraphEdge = { a: number; b: number };

export function graphDensity(width: number) {
  if (width <= 600) return 22;
  if (width <= 1000) return 34;
  if (width <= 1600) return 56;
  return 76;
}

/** A repeatable, jittered lattice: connected infrastructure, not free particles. */
export function graphGeometry(width: number, height: number) {
  const count = graphDensity(width);
  let seed = 4171;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const columns = Math.max(3, Math.round(Math.sqrt((count * width) / height)));
  const rows = Math.ceil(count / columns);
  const nodes: GraphNode[] = Array.from({ length: count }, (_, index) => ({
    u: ((index % columns) + 0.5 + (random() - 0.5) * 0.64) / columns,
    v: (Math.floor(index / columns) + 0.5 + (random() - 0.5) * 0.64) / rows,
    phase: random() * Math.PI * 2,
    amplitude: 2 + random() * 6,
    period: 8 + random() * 12,
    depth: 0.35 + (index % 3) * 0.325,
  }));
  const threshold = Math.min(320, Math.sqrt((width * height) / count) * 1.8);
  const candidates: (GraphEdge & { distance: number })[] = [];
  for (let a = 0; a < count; a++) {
    for (let b = a + 1; b < count; b++) {
      const distance = Math.hypot(
        (nodes[a].u - nodes[b].u) * width,
        (nodes[a].v - nodes[b].v) * height,
      );
      // Leave room for the full node drift while keeping live edges local.
      if (distance < threshold - 32) candidates.push({ a, b, distance });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const degree = new Uint8Array(count);
  const edges: GraphEdge[] = [];
  for (const edge of candidates) {
    if (degree[edge.a] >= 3 || degree[edge.b] >= 3) continue;
    degree[edge.a]++;
    degree[edge.b]++;
    edges.push({ a: edge.a, b: edge.b });
  }
  const candidateDegree = new Uint8Array(count);
  const pool: GraphEdge[] = [];
  for (const edge of candidates) {
    if (candidateDegree[edge.a] >= 7 || candidateDegree[edge.b] >= 7) continue;
    candidateDegree[edge.a]++;
    candidateDegree[edge.b]++;
    pool.push({ a: edge.a, b: edge.b });
  }
  return { nodes, edges, candidates: pool, threshold };
}
