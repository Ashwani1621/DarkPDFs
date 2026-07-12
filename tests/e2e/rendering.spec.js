import { test, expect } from "@playwright/test";
import { loadSamplePdf } from "./helpers.js";

test("uploading a sample pdf renders a non-empty canvas", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  const pixels = await page.locator("canvas").evaluate((canvas) => {
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let dark = 0;
    let light = 0;
    for (let i = 0; i < data.length; i += 4) {
      const luma = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (luma < 100) dark++;
      else if (luma > 200) light++;
    }
    return { dark, light, total: data.length / 4 };
  });

  // A rendered page has both page background and drawn text/border pixels.
  expect(pixels.total).toBeGreaterThan(0);
  expect(pixels.dark).toBeGreaterThan(0);
  expect(pixels.light).toBeGreaterThan(0);
});

test("next page changes the current page indicator", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  await page.getByRole("button", { name: /next page/i }).click();

  await expect(page.locator("#reader-status")).toHaveText(/page 2 of 3/i);
  await expect(page.getByLabel(/^page$/i)).toHaveValue("2");
});

test("previous page returns to the first page", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  await page.getByRole("button", { name: /next page/i }).click();
  await expect(page.locator("#reader-status")).toHaveText(/page 2 of 3/i);

  await page.getByRole("button", { name: /previous page/i }).click();
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i);
});

test("buttons are disabled at page boundaries", async ({ page }) => {
  await page.goto("/");
  await loadSamplePdf(page);

  await expect(page.getByRole("button", { name: /previous page/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /first page/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /next page/i })).toBeEnabled();

  await page.getByRole("button", { name: /last page/i }).click();
  await expect(page.locator("#reader-status")).toHaveText(/page 3 of 3/i);
  await expect(page.getByRole("button", { name: /next page/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /last page/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /previous page/i })).toBeEnabled();
});
