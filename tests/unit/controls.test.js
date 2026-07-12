import { describe, expect, it, vi } from "vitest";
import {
  ZOOM_STEPS,
  MIN_ZOOM,
  MAX_ZOOM,
  nextZoomStep,
  prevZoomStep,
  fitWidthScale,
  formatZoom,
  createZoomController,
} from "../../src/controls.js";

describe("zoom controls", () => {
  it("zoom in moves to the next configured zoom step", () => {
    expect(nextZoomStep(1)).toBe(1.25);
    expect(nextZoomStep(1.5)).toBe(2);
  });

  it("zoom out moves to the previous configured zoom step", () => {
    expect(prevZoomStep(1)).toBe(0.75);
    expect(prevZoomStep(2)).toBe(1.5);
  });

  it("zoom does not go below the minimum or above the maximum", () => {
    expect(nextZoomStep(MAX_ZOOM)).toBe(MAX_ZOOM);
    expect(prevZoomStep(MIN_ZOOM)).toBe(MIN_ZOOM);

    const controller = createZoomController({ initialZoom: MAX_ZOOM });
    expect(controller.zoomIn()).toBe(MAX_ZOOM);
  });

  it("reset returns to 100%", () => {
    const controller = createZoomController({ initialZoom: 2 });
    expect(controller.reset()).toBe(1);
    expect(formatZoom(controller.getZoom())).toBe("100%");
  });

  it("fit width computes scale from container width and page viewport width", () => {
    expect(fitWidthScale(1224, 612)).toBe(2);
    expect(fitWidthScale(306, 612)).toBe(0.5);
    // Clamped to the allowed range.
    expect(fitWidthScale(10000, 612)).toBe(MAX_ZOOM);
    expect(fitWidthScale(10, 612)).toBe(MIN_ZOOM);
    // Bad measurements fall back to the default.
    expect(fitWidthScale(0, 612)).toBe(1);
  });

  it("zoom changes trigger a re-render of the current page", () => {
    const onZoomChange = vi.fn();
    const controller = createZoomController({ onZoomChange });

    controller.zoomIn();
    expect(onZoomChange).toHaveBeenCalledWith(1.25);

    onZoomChange.mockClear();
    controller.zoomIn(); // 1.25 -> 1.5
    expect(onZoomChange).toHaveBeenCalledWith(1.5);
  });

  it("persists the zoom preference", () => {
    const storage = { set: vi.fn() };
    const controller = createZoomController({ storage });

    controller.zoomIn();
    expect(storage.set).toHaveBeenCalledWith("zoom", 1.25);
  });

  it("exposes the documented zoom steps", () => {
    expect(ZOOM_STEPS).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2, 3]);
  });
});
