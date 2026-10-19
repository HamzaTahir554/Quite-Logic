import { test, expect } from "@playwright/test";
import { withPublicReadTimeout } from "../lib/public-read";

test("public reads preserve successful values and ordinary failures", async () => {
  const result = { reviews: [{ name: "Client" }], total: 1 };
  await expect(withPublicReadTimeout(async () => result)).resolves.toBe(result);
  const error = new Error("Database unavailable");
  await expect(
    withPublicReadTimeout(async () => {
      throw error;
    }),
  ).rejects.toBe(error);
});

test("a stalled public read expires instead of holding the page open", async () => {
  await expect(
    withPublicReadTimeout(() => new Promise<never>(() => {}), 20),
  ).rejects.toThrow("Public content read timed out");
});

test("a late database rejection is still handled after the deadline", async () => {
  let rejectRead!: (error: Error) => void;
  const read = new Promise<never>((_, reject) => {
    rejectRead = reject;
  });
  await expect(withPublicReadTimeout(() => read, 20)).rejects.toThrow(
    "Public content read timed out",
  );
  rejectRead(new Error("Late database failure"));
  await new Promise((resolve) => setTimeout(resolve, 0));
});
