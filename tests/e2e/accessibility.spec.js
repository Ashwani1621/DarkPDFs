import { test, expect } from "@playwright/test";
import { loadSamplePdf } from "./helpers.js";

test("core controls have accessible names", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel(/choose pdf/i)).toBeVisible();
  await expect(page.getByLabel(/theme/i)).toBeVisible();
  await expect(page.getByLabel(/^page$/i)).toBeAttached();
  await expect(page.getByLabel(/invert pages/i)).toBeVisible();
  await expect(page.getByLabel(/brightness/i)).toBeVisible();
  await expect(page.getByLabel(/contrast/i)).toBeVisible();
  for (const name of [
    /first page/i,
    /previous page/i,
    /next page/i,
    /last page/i,
    /zoom in/i,
    /zoom out/i,
    /reset zoom/i,
    /fit width/i,
    /reset filters/i,
  ]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
});

test("keyboard users get a visible focus state", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth, id: el.id };
  });

  expect(outline.id).toBe("panel-toggle");
  expect(outline.style).not.toBe("none");
  expect(outline.width).not.toBe("0px");
});

test("the reader works at mobile viewport width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await loadSamplePdf(page);

  // On mobile the panel is an overlay drawer; close it to read.
  await page.getByRole("button", { name: /toggle controls/i }).click();
  await page.getByRole("button", { name: /next page/i }).click();
  await expect(page.locator("#reader-status")).toHaveText(/page 2 of 3/i);

  // The page must not scroll horizontally at mobile width.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the toolbar does not overlap the canvas", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  const header = await page.locator(".app-header").boundingBox();
  const canvas = await page.locator("canvas").boundingBox();

  expect(canvas.y).toBeGreaterThanOrEqual(header.y + header.height);
});

test("the open controls panel does not overlap the canvas on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await loadSamplePdf(page);

  const panel = await page.locator("#controls-panel").boundingBox();
  const canvas = await page.locator("canvas").boundingBox();

  expect(canvas.x + canvas.width).toBeLessThanOrEqual(panel.x + 1);
});
