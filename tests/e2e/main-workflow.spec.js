import { test, expect } from "@playwright/test";
import { loadSamplePdf } from "./helpers.js";

test("full reader workflow survives a reload", async ({ page }) => {
  await page.goto("/");

  // 1. Load the PDF.
  await loadSamplePdf(page);

  // 2. Change theme.
  await page.getByLabel(/theme/i).selectOption("solarized-dark");
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "solarized-dark");

  // 3. Toggle PDF inversion.
  await page.getByLabel(/invert pages/i).check();
  expect(await page.locator("canvas").evaluate((c) => c.style.filter)).toContain("invert(1)");

  // 4. Zoom in.
  await page.getByRole("button", { name: /zoom in/i }).click();
  await expect(page.locator("#zoom-label")).toHaveText("125%");

  // 5. Navigate to page 2.
  await page.getByRole("button", { name: /next page/i }).click();
  await expect(page.locator("#reader-status")).toHaveText(/page 2 of 3/i);

  // 6. Reload the app.
  await page.reload();

  // 7. Persisted theme, zoom, and filters are restored.
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "solarized-dark");
  await expect(page.getByLabel(/theme/i)).toHaveValue("solarized-dark");
  await expect(page.locator("#zoom-label")).toHaveText("125%");
  await expect(page.getByLabel(/invert pages/i)).toBeChecked();
  await expect(page.locator("#reader-status")).toHaveText(/no pdf loaded/i);

  // 8. The PDF loads again without stale errors, back on the remembered page.
  await page.getByLabel(/choose pdf/i).setInputFiles("fixtures/sample.pdf");
  await expect(page.locator("#reader-status")).toHaveText(/page 2 of 3/i, { timeout: 15000 });
  expect(await page.locator("canvas").evaluate((c) => c.style.filter)).toContain("invert(1)");
});
