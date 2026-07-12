import { test, expect } from "@playwright/test";
import { SAMPLE_PDF, NOT_A_PDF } from "./helpers.js";

test("uploading the sample pdf shows a loading state and then the page count", async ({ page }) => {
  await page.goto("/");

  // Record every status message so the transient loading state is observable.
  await page.evaluate(() => {
    window.__statusLog = [];
    const el = document.querySelector("#reader-status");
    new MutationObserver(() => window.__statusLog.push(el.textContent)).observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });

  await page.getByLabel(/choose pdf/i).setInputFiles(SAMPLE_PDF);
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i, { timeout: 15000 });

  const log = await page.evaluate(() => window.__statusLog);
  expect(log.some((text) => /loading/i.test(text))).toBe(true);
});

test("uploading a .txt file displays an error and does not render a pdf", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel(/choose pdf/i).setInputFiles(NOT_A_PDF);

  await expect(page.locator("#reader-status")).toHaveText(/not a pdf/i);
  await expect(page.locator("canvas")).toHaveCount(0);
});
