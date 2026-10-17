// Next's segment-prefetch URLs use dots where export emitted nested folders.
// Materialize equivalent files so ordinary static hosts need no runtime rewrite.
import { readdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
const root = "out";
let aliases = 0;
async function walk(directory, parts = []) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const next = [...parts, item.name];
    const path = join(directory, item.name);
    if (item.isDirectory()) await walk(path, next);
    else if (item.name.endsWith(".txt")) {
      const index = next.findIndex((part) => part.startsWith("__next."));
      if (index >= 0 && index < next.length - 1) {
        await copyFile(
          path,
          join(root, ...next.slice(0, index), next.slice(index).join(".")),
        );
        aliases++;
      }
    }
  }
}
await walk(root);
console.log(`Static navigation assets prepared: ${aliases}`);
