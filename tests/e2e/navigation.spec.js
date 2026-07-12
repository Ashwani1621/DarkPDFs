import { test, expect } from "@playwright/test";
import { loadSamplePdf } from "./helpers.js";

test("typing a valid page number renders that page", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  const pageInput = page.getByLabel(/^page$/i);
  await pageInput.fill("3");
  await pageInput.press("Enter");

  await expect(page.locator("#reader-status")).toHaveText(/page 3 of 3/i);
});

test("invalid page input restores the current page", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  const pageInput = page.getByLabel(/^page$/i);
  await pageInput.fill("99");
  await pageInput.press("Enter");

  await expect(pageInput).toHaveValue("1");
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i);
});

test("keyboard navigation changes pages", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);
  // Move focus out of the toolbar so shortcuts are active.
  await page.locator("body").click();

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#reader-status")).toHaveText(/page 2 of 3/i);

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i);

  await page.keyboard.press("End");
  await expect(page.locator("#reader-status")).toHaveText(/page 3 of 3/i);

  await page.keyboard.press("Home");
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i);
});

test("keyboard shortcuts do not fire while using the theme selector or page input", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  // Arrow keys inside the theme select must not change the page.
  await page.getByLabel(/theme/i).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("End");
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i);

  // Home/End inside the page input edit text instead of navigating.
  const pageInput = page.getByLabel(/^page$/i);
  await pageInput.focus();
  await page.keyboard.press("End");
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i);
});
