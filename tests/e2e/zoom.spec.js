import { test, expect } from "@playwright/test";
import { loadSamplePdf, canvasSize } from "./helpers.js";

test("zoom in increases canvas size", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);
  const before = await canvasSize(page);

  await page.getByRole("button", { name: /zoom in/i }).click();
  await expect(page.locator("#zoom-label")).toHaveText("125%");

  await expect.poll(async () => (await canvasSize(page)).width).toBeGreaterThan(before.width);
});

test("zoom out decreases canvas size", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);
  const before = await canvasSize(page);

  await page.getByRole("button", { name: /zoom out/i }).click();
  await expect(page.locator("#zoom-label")).toHaveText("75%");

  await expect.poll(async () => (await canvasSize(page)).width).toBeLessThan(before.width);
});

test("reset returns the zoom label to 100%", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  await page.getByRole("button", { name: /zoom in/i }).click();
  await page.getByRole("button", { name: /zoom in/i }).click();
  await expect(page.locator("#zoom-label")).toHaveText("150%");

  await page.getByRole("button", { name: /reset zoom/i }).click();
  await expect(page.locator("#zoom-label")).toHaveText("100%");
});

test("reload restores the saved zoom preference", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /zoom in/i }).click();
  await page.getByRole("button", { name: /zoom in/i }).click();
  await expect(page.locator("#zoom-label")).toHaveText("150%");

  await page.reload();

  await expect(page.locator("#zoom-label")).toHaveText("150%");
});
