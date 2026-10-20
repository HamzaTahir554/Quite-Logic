import { expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { Project } from "../lib/models";

/** Runs only inside the test runner's disposable database, through real uploads. */
export async function testProjectMedia(
  page: Page,
  check: (value: unknown, label: string) => void,
) {
  console.log(
    "Testing arbitrary Admin uploads, intrinsic image bounds and media presentation…",
  );
  const originals = await Project.find().sort({ order: 1, _id: 1 }).lean();
  const originalTheme = await page.evaluate(() =>
    localStorage.getItem("quietlogic-theme"),
  );
  const origin = new URL(page.url()).origin;
  const headers = { Origin: origin };
  await mkdir("qa/media-fabric", { recursive: true });
  try {
    for (const theme of ["day", "night"]) {
      await page.evaluate(
        (value) => localStorage.setItem("quietlogic-theme", value),
        theme,
      );
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto("/");
        for (const card of await page
          .locator(".home-projects .project-card")
          .all()) {
          await card.scrollIntoViewIfNeeded();
          await card
            .locator("img")
            .evaluate((img: HTMLImageElement) => img.decode());
        }
        await page.locator(".home-projects .project-list").screenshot({
          path: `qa/media-fabric/projects-${theme}-${width}.png`,
          style:
            ".site-header, .skip-link, .studio-cursor { visibility: hidden !important; }",
        });
      }
    }
    for (const [index, size] of [
      [800, 1000],
      [1200, 400],
      [80, 60],
    ].entries()) {
      const image = await sharp({
        create: {
          width: size[0],
          height: size[1],
          channels: 4,
          background: "#2f80fe",
        },
      })
        .composite([
          {
            input: Buffer.from(
              `<svg width="${size[0]}" height="${size[1]}"><rect x="8" y="8" width="${size[0] - 16}" height="${size[1] - 16}" rx="8" fill="#f0f1f8"/></svg>`,
            ),
          },
        ])
        .png()
        .toBuffer();
      const upload = await page.request.post("/api/admin/uploads", {
        headers,
        multipart: {
          file: {
            name: `media-${index}.png`,
            mimeType: "image/png",
            buffer: image,
          },
        },
      });
      expect(upload.status()).toBe(201);
      const { logo } = await upload.json();
      const response = await page.request.patch(
        `/api/admin/projects/${originals[index]._id}`,
        {
          headers,
          data: {
            title:
              index === 0
                ? "AI Voice Doctor Appointment System"
                : index === 1
                  ? "Wide screenshot fixture"
                  : "Small logo fixture",
            logo,
            mediaType: index === 0 ? "illustration" : "logo",
            showOnHome: true,
            status: "published",
            order: index,
          },
        },
      );
      expect(response.ok()).toBe(true);
    }
    for (const theme of ["day", "night"]) {
      await page.evaluate(
        (value) => localStorage.setItem("quietlogic-theme", value),
        theme,
      );
      for (const width of [320, 375, 390, 425, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto("/");
        const cards = page.locator(".home-projects .project-card");
        await expect(cards).toHaveCount(3);
        for (const card of await cards.all()) {
          const image = card.locator(".home-project-visual img");
          await image.scrollIntoViewIfNeeded();
          await image.evaluate((img: HTMLImageElement) => img.decode());
          const bounds = await image.evaluate((img: HTMLImageElement) => {
            const image = img.getBoundingClientRect(),
              panel = img
                .closest(".home-project-visual")!
                .getBoundingClientRect();
            return {
              dx: Math.abs(
                image.x + image.width / 2 - panel.x - panel.width / 2,
              ),
              dy: Math.abs(
                image.y + image.height / 2 - panel.y - panel.height / 2,
              ),
              gap: Math.min(
                image.x - panel.x,
                image.y - panel.y,
                panel.right - image.right,
                panel.bottom - image.bottom,
              ),
              width: image.width,
              height: image.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              ratio: image.width / image.height,
              naturalRatio: img.naturalWidth / img.naturalHeight,
              panel: { width: panel.width, height: panel.height },
            };
          });
          expect(bounds.dx).toBeLessThan(1);
          expect(bounds.dy).toBeLessThan(1);
          expect(bounds.gap).toBeGreaterThanOrEqual(23);
          expect(bounds.width).toBeLessThanOrEqual(
            Math.min(560, bounds.naturalWidth) + 1,
          );
          expect(bounds.height).toBeLessThanOrEqual(
            Math.min(460, bounds.naturalHeight) + 1,
          );
          expect(bounds.ratio).toBeCloseTo(bounds.naturalRatio, 2);
          await expect(image).toHaveCSS("object-fit", "contain");
          if (width > 900) {
            const text = (await card.locator(".project-copy").boundingBox())!;
            expect(Math.abs(text.height - bounds.panel.height)).toBeLessThan(1);
          }
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        check(
          true,
          `${theme} ${width}px: tall illustration, wide image and small logo centered, contained, not enlarged, no overflow`,
        );
        if ([390, 1440].includes(width)) {
          await cards.first().scrollIntoViewIfNeeded();
          await cards.first().screenshot({
            path: `qa/media-fabric/doctor-${theme}-${width}.png`,
          });
        }
      }
    }
    const id = originals[1]._id;
    expect(
      (
        await page.request.patch(`/api/admin/projects/${id}`, {
          headers,
          data: { mediaType: "screenshot" },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.patch(`/api/admin/projects/${id}`, {
          headers,
          data: { category: "Updated category" },
        })
      ).ok(),
    ).toBe(true);
    await page.goto("/");
    const screenshot = page.locator('[data-media-type="screenshot"] img');
    await screenshot.scrollIntoViewIfNeeded();
    await expect(screenshot).toHaveCSS("object-fit", "cover");
    expect(
      (
        await page.request.patch(`/api/admin/projects/${id}`, {
          headers,
          data: { mediaType: "invalid" },
        })
      ).status(),
    ).toBe(400);
    await page.goto("/admin/portfolio");
    await page
      .locator(".admin-project-record")
      .filter({ hasText: "Wide screenshot fixture" })
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    await expect(page.getByLabel("Home image presentation")).toHaveValue(
      "screenshot",
    );
    check(
      true,
      "Screenshot cover persists through omitted-field PATCH; invalid types rejected; Admin editor exposes saved presentation",
    );
  } finally {
    for (const project of originals) {
      const { _id, ...fields } = project;
      await Project.updateOne(
        { _id },
        { $set: { ...fields, mediaType: fields.mediaType || "logo" } },
      );
    }
    await page.evaluate((value) => {
      if (value) localStorage.setItem("quietlogic-theme", value);
      else localStorage.removeItem("quietlogic-theme");
    }, originalTheme);
  }
}
