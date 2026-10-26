import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("authenticated profile and moderated client DP uploads validate and persist durably", async ({
  page,
  baseURL,
}) => {
  test.skip(
    process.env.E2E_PROFILE_FIXTURE !== "true",
    "Requires a disposable fixture account from the integration runner.",
  );
  const origin = baseURL!;
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("profile-admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("LocalProfile1!Password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/account");
  const editor = page.locator(".avatar-editor");
  await expect(
    editor.getByLabel("Profile image", { exact: true }),
  ).toBeEnabled();
  const png = await sharp({
    create: { width: 40, height: 24, channels: 3, background: "#2f80fe" },
  })
    .png()
    .toBuffer();
  await editor
    .getByLabel("Profile image", { exact: true })
    .setInputFiles({ name: "profile.png", mimeType: "image/png", buffer: png });
  await expect(editor.locator("img")).toHaveAttribute("src", /^blob:/);
  await editor.getByRole("button", { name: "Save Image" }).click();
  await expect(editor.locator("img")).toHaveAttribute(
    "src",
    /^\/api\/avatars\//,
  );
  await page.reload();
  await expect(editor.locator("img")).toBeVisible();
  await editor.getByRole("button", { name: "Remove Image" }).click();
  await expect(editor.locator("img")).toHaveCount(0);
  const email = `avatar-${Date.now()}@example.test`;
  let response = await page.request.post("/api/reviews", {
    headers: { Origin: origin },
    data: {
      clientName: "Avatar Client Test",
      email,
      rating: 5,
      review: "Thoughtful communication and reliable software delivered.",
      company: "",
      role: "",
      service: "",
    },
  });
  expect(response.status()).toBe(201);
  response = await page.request.get(
    "/api/admin/reviews?search=Avatar%20Client%20Test",
  );
  const { items } = await response.json();
  const review = items.find((item: { email: string }) => item.email === email);
  expect(review).toBeTruthy();
  response = await page.request.post(
    `/api/admin/reviews/${review._id}/avatar`,
    {
      headers: { Origin: origin },
      multipart: {
        file: { name: "fake.jpg", mimeType: "image/jpeg", buffer: png },
      },
    },
  );
  expect(response.status()).toBe(400);
  response = await page.request.post(
    `/api/admin/reviews/${review._id}/avatar`,
    {
      headers: { Origin: origin },
      multipart: {
        file: { name: "profile.png", mimeType: "image/png", buffer: png },
      },
    },
  );
  expect(response.status()).toBe(200);
  const { avatarUrl } = await response.json();
  const anonymous = await page
    .context()
    .browser()!
    .newContext({ baseURL: origin });
  try {
    expect((await anonymous.request.get(avatarUrl)).status()).toBe(404);
    await page.request.patch(`/api/admin/reviews/${review._id}`, {
      headers: { Origin: origin },
      data: { status: "approved" },
    });
    const image = await anonymous.request.get(avatarUrl);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/webp");
    const publicResponse = await anonymous.request.get("/api/reviews");
    expect(JSON.stringify(await publicResponse.json())).not.toContain(email);
  } finally {
    await anonymous.close();
  }
  await page.request.delete(`/api/admin/reviews/${review._id}`, {
    headers: { Origin: origin },
  });
});
