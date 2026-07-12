import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  THEMES,
  DEFAULT_THEME,
  getThemes,
  applyTheme,
  setupThemeSelector,
} from "../../src/themes.js";

describe("themes", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.body.innerHTML = "<select id='theme-select'></select>";
  });

  it("returns a complete list of supported themes with stable ids and labels", () => {
    const themes = getThemes();
    expect(themes.map((t) => t.id)).toEqual([
      "midnight",
      "graphite",
      "sepia-dark",
      "solarized-dark",
      "high-contrast",
    ]);
    for (const theme of themes) {
      expect(theme.label).toBeTruthy();
    }
    // Returned list is a copy: mutating it must not corrupt the source.
    themes.pop();
    expect(THEMES).toHaveLength(5);
  });

  it("applies the selected theme by setting data-theme on the root", () => {
    applyTheme("graphite");
    expect(document.documentElement.getAttribute("data-theme")).toBe("graphite");
  });

  it("falls back to the default theme for an unknown theme id", () => {
    const applied = applyTheme("hotdog-stand");
    expect(applied).toBe(DEFAULT_THEME);
    expect(document.documentElement.getAttribute("data-theme")).toBe(DEFAULT_THEME);
  });

  it("updates the theme selector value when a theme is applied", () => {
    const select = document.querySelector("#theme-select");
    const controller = setupThemeSelector(select);

    controller.setTheme("solarized-dark");

    expect(select.value).toBe("solarized-dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("solarized-dark");
  });

  it("calls the onChange callback when the user changes theme", () => {
    const select = document.querySelector("#theme-select");
    const onChange = vi.fn();
    setupThemeSelector(select, { onChange });

    select.value = "sepia-dark";
    select.dispatchEvent(new Event("change"));

    expect(onChange).toHaveBeenCalledWith("sepia-dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia-dark");
  });
});
