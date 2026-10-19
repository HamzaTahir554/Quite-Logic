import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const label = process.argv[2] || "after";
const directory = `qa/mobile-day/${label}`;
const origin = "http://localhost:3231";
await mkdir(directory, { recursive: true });
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", "3231"],
  {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      APP_URL: origin,
      MONGODB_URI: "",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "1",
      SMTP_FROM: "test@example.test",
    },
  },
);
const report = [];
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin + "/admin/login")).ok) break;
    } catch {
      /* starting */
    }
    if (server.exitCode !== null)
      throw new Error("Audit server exited before startup");
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const engines = [
    ["chromium", chromium],
    ...(existsSync(webkit.executablePath()) ? [["webkit", webkit]] : []),
  ];
  for (const [name, engine] of engines) {
    const browser = await engine.launch({
      headless: true,
      ...(label.includes("feature-dark")
        ? {
            args: [
              "--enable-features=WebContentsForceDark",
              "--force-dark-mode",
            ],
          }
        : {}),
    });
    try {
      for (const width of [320, 375, 390, 412, 425]) {
        const context = await browser.newContext({
          ...(process.argv.includes("--pixel") ? devices["Pixel 7"] : {}),
          viewport: { width, height: 844 },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: process.argv.includes("--pixel")
            ? devices["Pixel 7"].deviceScaleFactor
            : 1,
          reducedMotion: "no-preference",
          colorScheme: "light",
        });
        await context.addInitScript(() =>
          localStorage.setItem("quietlogic-theme", "day"),
        );
        const page = await context.newPage();
        if (label.includes("auto-dark") && name === "chromium") {
          const session = await context.newCDPSession(page);
          await session.send("Emulation.setAutoDarkModeOverride", {
            enabled: true,
          });
        }
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(origin);
        if (process.argv.includes("--only-light")) {
          await page.addStyleTag({
            content: ':root[data-theme="day"] { color-scheme: only light; }',
          });
        }
        await page.locator("html[data-studio-ready=true]").waitFor();
        const heading = page
          .locator(".section-heading")
          .filter({ hasText: "Focused design." });
        await heading.evaluate((node) =>
          window.scrollTo({
            top: node.getBoundingClientRect().top + scrollY - 270,
            behavior: "instant",
          }),
        );
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${directory}/${name}-${width}.png` });
        const audit = await page.evaluate(() => {
          const selectors = [
            "html",
            "body",
            ".public-site",
            "main",
            ".graph-background",
            ".graph-background canvas",
            ".graph-background::after",
            ".cube-shadow",
            ".section-end",
            ".section-heading",
            ".section-heading p",
            ".section-label",
            ".project-card",
            ".project-visual",
          ];
          const styles = Object.fromEntries(
            selectors.map((selector) => {
              const [base, pseudo] = selector.split("::");
              const node = document.querySelector(base);
              if (!node) return [selector, null];
              const style = getComputedStyle(
                node,
                pseudo ? `::${pseudo}` : undefined,
              );
              const rect = node.getBoundingClientRect();
              return [
                selector,
                {
                  scheme: style.colorScheme,
                  background: style.background,
                  shadow: style.boxShadow,
                  filter: style.filter,
                  opacity: style.opacity,
                  color: style.color,
                  fontSize: style.fontSize,
                  blend: style.mixBlendMode,
                  width: rect.width,
                  height: rect.height,
                },
              ];
            }),
          );
          const largePaints = [...document.querySelectorAll("body *")].flatMap(
            (node) => {
              const rect = node.getBoundingClientRect();
              if (rect.width < innerWidth * 0.5 || rect.height < 200) return [];
              return [null, "::before", "::after"].flatMap((pseudo) => {
                const style = getComputedStyle(node, pseudo);
                if (
                  pseudo &&
                  (style.content === "none" || style.display === "none")
                )
                  return [];
                if (
                  style.backgroundImage === "none" &&
                  style.boxShadow === "none" &&
                  style.filter === "none"
                )
                  return [];
                return [
                  {
                    selector: `${node.tagName.toLowerCase()}.${typeof node.className === "string" ? node.className : ""}${pseudo || ""}`,
                    background: style.background,
                    shadow: style.boxShadow,
                    filter: style.filter,
                    opacity: style.opacity,
                    position: style.position,
                    width: rect.width,
                    height: rect.height,
                  },
                ];
              });
            },
          );
          return {
            theme: document.documentElement.dataset.theme,
            overflow: document.documentElement.scrollWidth > innerWidth,
            styles,
            largePaints,
          };
        });
        report.push({ engine: name, width, errors, ...audit });
        console.log(
          `${label}: ${name} ${width}px captured; overflow=${audit.overflow}`,
        );
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  await writeFile(`${directory}/audit.json`, JSON.stringify(report, null, 2));
} finally {
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
}
