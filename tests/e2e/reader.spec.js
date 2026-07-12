import { test, expect } from "@playwright/test";

const CORE_CONTROLS = [
  ["heading", /dark pdfs/i],
  ["label", /choose pdf/i],
  ["label", /theme/i],
  ["button", /zoom in/i],
  ["button", /zoom out/i],
];

async function expectCoreControlsVisible(page) {
  await expect(page.getByRole("heading", { name: /dark pdfs/i })).toBeVisible();
  await expect(page.getByLabel(/choose pdf/i)).toBeVisible();
  await expect(page.getByLabel(/theme/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /previous page/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /next page/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /zoom in/i })).toBeVisible();
  await expect(page.getByText(/no pdf loaded/i)).toBeVisible();
}

test("the app loads without console errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /dark pdfs/i })).toBeVisible();

  expect(errors).toEqual([]);
});

test("core controls are visible on a desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expectCoreControlsVisible(page);
});

test("core controls are visible on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expectCoreControlsVisible(page);
});

test("keyboard focus moves through the toolbar in a sensible order", async ({ page }) => {
  await page.goto("/");

  const stops = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => document.activeElement.id));
  }

  const positionOf = (id) => stops.indexOf(id);
  expect(positionOf("panel-toggle")).toBeGreaterThanOrEqual(0);
  expect(positionOf("pdf-input")).toBeGreaterThan(positionOf("panel-toggle"));
  expect(positionOf("theme-select")).toBeGreaterThan(positionOf("pdf-input"));
  expect(positionOf("zoom-out")).toBeGreaterThan(positionOf("theme-select"));
  expect(positionOf("zoom-in")).toBeGreaterThan(positionOf("zoom-out"));
});
