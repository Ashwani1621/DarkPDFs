import { describe, expect, it, beforeEach } from "vitest";
import { getByLabelText, getByRole, getByText } from "@testing-library/dom";
import { renderAppShell } from "../../src/app.js";

describe("app shell", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it("renders the core reader controls", () => {
    renderAppShell(document.querySelector("#app"));

    expect(getByRole(document.body, "heading", { name: /dark pdfs/i })).toBeTruthy();
    expect(getByLabelText(document.body, /choose pdf/i)).toBeTruthy();
    expect(getByLabelText(document.body, /theme/i)).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /previous/i })).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /next/i })).toBeTruthy();
    expect(getByText(document.body, /no pdf loaded/i)).toBeTruthy();
  });

  it("does not render a canvas before a PDF is loaded", () => {
    renderAppShell(document.querySelector("#app"));

    expect(document.querySelector("canvas")).toBeNull();
  });

  it("renders page, zoom, and filter controls with accessible labels", () => {
    renderAppShell(document.querySelector("#app"));

    expect(getByLabelText(document.body, /^page$/i)).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /first page/i })).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /last page/i })).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /zoom in/i })).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /zoom out/i })).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /reset zoom/i })).toBeTruthy();
    expect(getByRole(document.body, "button", { name: /fit width/i })).toBeTruthy();
    expect(getByLabelText(document.body, /invert pages/i)).toBeTruthy();
    expect(getByLabelText(document.body, /brightness/i)).toBeTruthy();
    expect(getByLabelText(document.body, /contrast/i)).toBeTruthy();
    expect(getByText(document.body, "100%")).toBeTruthy();
  });

  it("starts with navigation controls disabled until a PDF is loaded", () => {
    renderAppShell(document.querySelector("#app"));

    expect(getByRole(document.body, "button", { name: /previous/i }).disabled).toBe(true);
    expect(getByRole(document.body, "button", { name: /next/i }).disabled).toBe(true);
    expect(getByLabelText(document.body, /^page$/i).disabled).toBe(true);
  });

  it("renders a controls panel with an accessible toggle button", () => {
    renderAppShell(document.querySelector("#app"));

    const panel = document.querySelector("#controls-panel");
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("aria-label")).toMatch(/controls/i);

    const toggle = getByRole(document.body, "button", { name: /toggle controls/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe("controls-panel");
  });

  it("places the page arrows beside the canvas, not inside the panel", () => {
    renderAppShell(document.querySelector("#app"));

    const prev = getByRole(document.body, "button", { name: /previous page/i });
    const next = getByRole(document.body, "button", { name: /next page/i });
    const canvasRow = document.querySelector(".canvas-row");
    const panel = document.querySelector("#controls-panel");

    expect(canvasRow.contains(prev)).toBe(true);
    expect(canvasRow.contains(next)).toBe(true);
    expect(panel.contains(prev)).toBe(false);
    expect(panel.contains(next)).toBe(false);
  });
});