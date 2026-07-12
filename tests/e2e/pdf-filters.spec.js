import { test, expect } from "@playwright/test";
import { loadSamplePdf } from "./helpers.js";

const canvasFilter = (page) =>
  page.locator("canvas").evaluate((c) => getComputedStyle(c).filter);

async function setSlider(page, label, value) {
  await page.getByLabel(label).evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, String(value));
}

test("toggling inversion changes the canvas filter style", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);
  expect(await canvasFilter(page)).toBe("none");

  await page.getByLabel(/invert pages/i).check();
  expect(await canvasFilter(page)).toContain("invert(1)");

  await page.getByLabel(/invert pages/i).uncheck();
  expect(await canvasFilter(page)).toBe("none");
});

test("moving brightness and contrast sliders updates the visible filter", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  await setSlider(page, /brightness/i, 1.2);
  expect(await canvasFilter(page)).toContain("brightness(1.2)");

  await setSlider(page, /contrast/i, 0.8);
  expect(await canvasFilter(page)).toContain("contrast(0.8)");
});

test("reset clears custom filter values", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  await page.getByLabel(/invert pages/i).check();
  await setSlider(page, /brightness/i, 1.4);
  expect(await canvasFilter(page)).not.toBe("none");

  await page.getByRole("button", { name: /reset filters/i }).click();

  expect(await canvasFilter(page)).toBe("none");
  await expect(page.getByLabel(/invert pages/i)).not.toBeChecked();
});

test("filter preferences persist across reload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/invert pages/i).check();

  await page.reload();

  await expect(page.getByLabel(/invert pages/i)).toBeChecked();
  await loadSamplePdf(page);
  expect(await canvasFilter(page)).toContain("invert(1)");
});
