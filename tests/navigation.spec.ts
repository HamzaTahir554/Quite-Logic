import { test, expect } from "@playwright/test";
test("internal links and brand spelling are consistent", async ({
  page,
  request,
}) => {
  const links = new Set<string>();
  for (const path of [
    "/",
    "/services",
    "/about",
    "/work",
    "/portfolio",
    "/contact",
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    await expect(page.locator("body")).not.toContainText("Quiet Logic");
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((elements) =>
        elements.map((el) => (el as HTMLAnchorElement).href),
      );
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin === new URL(page.url()).origin)
        links.add(url.pathname + url.search + url.hash);
    }
  }
  for (const href of links) {
    const url = new URL(href, "http://localhost:3000");
    const response = await request.get(url.pathname + url.search);
    expect(response.status(), href).toBe(200);
    if (url.hash) {
      const html = await response.text();
      const id = decodeURIComponent(url.hash.slice(1));
      expect(html, href).toContain('id="' + id + '"');
    }
  }
});
