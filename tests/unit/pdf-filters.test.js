import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FILTERS,
  clampFilters,
  toCssFilter,
  createFilterController,
} from "../../src/pdf-filters.js";

describe("pdf filters", () => {
  it("default filter state is readable and conservative", () => {
    expect(DEFAULT_FILTERS).toEqual({ invert: false, brightness: 1, contrast: 1 });
    expect(toCssFilter(DEFAULT_FILTERS)).toBe("none");
  });

  it("inversion toggle updates filter state", () => {
    const controller = createFilterController();
    controller.toggleInvert();
    expect(controller.getState().invert).toBe(true);
    controller.toggleInvert();
    expect(controller.getState().invert).toBe(false);
  });

  it("clamps brightness and contrast to allowed ranges", () => {
    expect(clampFilters({ brightness: 99, contrast: -5 })).toMatchObject({
      brightness: 1.5,
      contrast: 0.5,
    });
    expect(clampFilters({ brightness: "garbage", contrast: NaN })).toMatchObject({
      brightness: 1,
      contrast: 1,
    });

    const controller = createFilterController();
    controller.setBrightness(42);
    expect(controller.getState().brightness).toBe(1.5);
  });

  it("generates the expected css filter string", () => {
    expect(toCssFilter({ invert: true, brightness: 1, contrast: 1 })).toBe(
      "invert(1) hue-rotate(180deg)"
    );
    expect(toCssFilter({ invert: false, brightness: 1.2, contrast: 0.9 })).toBe(
      "brightness(1.2) contrast(0.9)"
    );
    expect(toCssFilter({ invert: true, brightness: 0.8, contrast: 1.1 })).toBe(
      "invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.1)"
    );
  });

  it("persists filter preferences and restores them", () => {
    const stored = {};
    const storage = {
      set: vi.fn((key, value) => (stored[key] = value)),
      get: (key, fallback) => stored[key] ?? fallback,
    };

    const controller = createFilterController({ storage });
    controller.setInvert(true);
    controller.setBrightness(1.2);
    expect(storage.set).toHaveBeenCalledWith(
      "pdfFilters",
      expect.objectContaining({ invert: true, brightness: 1.2 })
    );

    // A new controller (as after reload) restores the saved state.
    const restored = createFilterController({ initial: storage.get("pdfFilters") });
    expect(restored.getState()).toMatchObject({ invert: true, brightness: 1.2 });
  });

  it("reset restores defaults", () => {
    const controller = createFilterController();
    controller.setInvert(true);
    controller.setBrightness(1.4);
    controller.setContrast(0.6);

    controller.reset();
    expect(controller.getState()).toEqual({ ...DEFAULT_FILTERS });
    expect(controller.getCssFilter()).toBe("none");
  });
});
