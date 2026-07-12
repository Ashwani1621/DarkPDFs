import { test, expect } from "@playwright/test";
import { loadSamplePdf } from "./helpers.js";

const toggle = (page) => page.getByRole("button", { name: /toggle controls/i });
const panel = (page) => page.locator("#controls-panel");

test("toggling hides the panel while canvas and arrows stay visible", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);
  await expect(page.getByRole("button", { name: /zoom in/i })).toBeVisible();

  await toggle(page).click();

  await expect(panel(page)).toBeHidden();
  await expect(page.getByRole("button", { name: /zoom in/i })).toBeHidden();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: /previous page/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /next page/i })).toBeVisible();

  await toggle(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(page.getByRole("button", { name: /zoom in/i })).toBeVisible();
});

test("panel state persists across reload", async ({ page }) => {
  await page.goto("/");
  await expect(panel(page)).toBeVisible();

  await toggle(page).click();
  await page.reload();

  await expect(panel(page)).toBeHidden();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");

  await toggle(page).click();
  await page.reload();
  await expect(panel(page)).toBeVisible();
});

test("reading still works with the panel hidden", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);
  await toggle(page).click();
  await expect(panel(page)).toBeHidden();

  // Canvas-side arrows navigate.
  await page.getByRole("button", { name: /next page/i }).click();
  await expect(page.locator("#reader-status")).toHaveText(/page 2 of 3/i);

  // Keyboard shortcuts navigate.
  await page.locator("body").click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#reader-status")).toHaveText(/page 3 of 3/i);
  await page.keyboard.press("Home");
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i);
});
