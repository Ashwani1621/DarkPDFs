import { expect } from "@playwright/test";

export const SAMPLE_PDF = "fixtures/sample.pdf";
export const NOT_A_PDF = "fixtures/not-a-pdf.txt";

export async function loadSamplePdf(page) {
  await page.getByLabel(/choose pdf/i).setInputFiles(SAMPLE_PDF);
  await expect(page.locator("#reader-status")).toHaveText(/page 1 of 3/i, { timeout: 15000 });
}

export function canvasSize(page) {
  return page.locator("canvas").evaluate((c) => ({ width: c.width, height: c.height }));
}
