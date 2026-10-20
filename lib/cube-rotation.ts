import { faceRotations } from "../data/serviceFaces";

export type Rotation = [number, number, number, number];
export function multiply(a: Rotation, b: Rotation): Rotation {
  const [x, y, z, w] = a,
    [u, v, t, s] = b;
  return [
    w * u + x * s + y * t - z * v,
    w * v - x * t + y * s + z * u,
    w * t + x * v - y * u + z * s,
    w * s - x * u - y * v - z * t,
  ];
}
export function turn(x: number, y: number): Rotation {
  return multiply(
    [Math.sin(x / 2), 0, 0, Math.cos(x / 2)],
    [0, Math.sin(y / 2), 0, Math.cos(y / 2)],
  );
}
export const cubeOrientations = faceRotations.map(([x, y]) => turn(x, y));
export function nearestFace(q: Rotation) {
  const normals = [
    [0, 0, 1],
    [1, 0, 0],
    [0, 0, -1],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ];
  const [x, y, z, w] = q;
  let best = 0,
    similarity = -Infinity;
  normals.forEach(([nx, ny, nz], index) => {
    const dot =
      2 * (x * z - w * y) * nx +
      2 * (y * z + w * x) * ny +
      (1 - 2 * (x * x + y * y)) * nz;
    if (dot > similarity) {
      best = index;
      similarity = dot;
    }
  });
  return best;
}
export function blend(a: Rotation, b: Rotation, amount: number): Rotation {
  const dot = a.reduce((sum, n, i) => sum + n * b[i], 0);
  const next = a.map(
    (n, i) => n + ((dot < 0 ? -b[i] : b[i]) - n) * amount,
  ) as Rotation;
  const length = Math.hypot(...next);
  return next.map((n) => n / length) as Rotation;
}
export function cssRotation(q: Rotation) {
  // CSS has a downward Y axis; reflect the WebGL rotation into that space.
  const angle = 2 * Math.acos(Math.max(-1, Math.min(1, q[3])));
  return angle < 0.00001
    ? "rotate3d(1,0,0,0rad)"
    : `rotate3d(${-q[0]},${q[1]},${-q[2]},${angle}rad)`;
}
