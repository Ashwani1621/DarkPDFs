import { test, expect } from "@playwright/test";

const bodyBackground = (page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("changing the theme visibly changes the app background color", async ({ page }) => {
  await page.goto("/");
  const before = await bodyBackground(page);

  await page.getByLabel(/theme/i).selectOption("solarized-dark");

  await expect(page.locator(":root")).toHaveAttribute("data-theme", "solarized-dark");
  const after = await bodyBackground(page);
  expect(after).not.toBe(before);
});

test("theme choice persists after page reload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/theme/i).selectOption("sepia-dark");

  await page.reload();

  await expect(page.locator(":root")).toHaveAttribute("data-theme", "sepia-dark");
  await expect(page.getByLabel(/theme/i)).toHaveValue("sepia-dark");
});

test("high contrast theme keeps toolbar text readable", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/theme/i).selectOption("high-contrast");

  const colors = await page.evaluate(() => {
    const label = document.querySelector(".controls-panel label");
    const panel = document.querySelector(".controls-panel");
    return {
      text: getComputedStyle(label).color,
      background: getComputedStyle(panel).backgroundColor,
    };
  });

  expect(colors.text).toBe("rgb(255, 255, 255)");
  expect(colors.background).toBe("rgb(0, 0, 0)");
});
