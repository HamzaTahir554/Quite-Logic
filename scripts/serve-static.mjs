// Local preview only. Production can serve out/ directly with any static host.
import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const args = process.argv.slice(2);
const arg = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const port = Number(arg("--port", process.env.PORT || "3000"));
const hostname = arg("--hostname", "127.0.0.1");
const root = resolve("out");
try {
  await stat(resolve(root, "index.html"));
} catch {
  console.error("Static export missing. Run npm run build first.");
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};
createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!["GET", "HEAD"].includes(request.method || "")) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(request.url || "/", "http://localhost").pathname,
    );
    if (pathname.split("/").some((part) => part.startsWith("."))) {
      response.writeHead(404);
      response.end();
      return;
    }
    const candidate = resolve(root, "." + pathname);
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      response.writeHead(404);
      response.end();
      return;
    }
    let file;
    for (const path of [
      candidate,
      candidate + ".html",
      resolve(candidate, "index.html"),
    ]) {
      try {
        if ((await stat(path)).isFile()) {
          file = path;
          break;
        }
      } catch {}
    }
    const status = file ? 200 : 404;
    file ||= resolve(root, "404.html");
    const data = await readFile(file);
    response.writeHead(status, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Content-Length": data.length,
    });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch {
    response.writeHead(400);
    response.end("Invalid request.");
  }
}).listen(port, hostname, () =>
  console.log(`Static Quite Logic preview: http://${hostname}:${port}`),
);
