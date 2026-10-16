import { services } from "./content";

export const serviceFaces = [
  ...services,
  {
    slug: "all-services",
    name: "Quite Logic",
    short: "Explore All",
    icon: "QL",
    description: "Five connected disciplines. One considered approach.",
  },
];

// Matching front, right, back, left, top, and bottom faces in both renderers.
export const faceRotations: [number, number, number][] = [
  [0, 0, 0],
  [0, -Math.PI / 2, 0],
  [0, -Math.PI, 0],
  [0, Math.PI / 2, 0],
  [Math.PI / 2, 0, 0],
  [-Math.PI / 2, 0, 0],
];
