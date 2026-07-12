import { describe, expect, it, beforeEach } from "vitest";
import { setupApp } from "../../src/app.js";

function fakeFile() {
  return { name: "doc.pdf", type: "application/pdf", arrayBuffer: async () => new ArrayBuffer(16) };
}

function fakePdfDocument(numPages = 3) {
  return {
    numPages,
    fingerprints: ["fingerprint-abc"],
    getPage: async () => ({
      getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
      render: () => ({ promise: Promise.resolve() }),
    }),
  };
}

function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: (key, fallback = null) => (store.has(key) ? store.get(key) : fallback),
    set: (key, value) => store.set(key, value),
    getDoc: () => null,
    setDoc: () => {},
  };
}

const fakePdfjs = () => ({ getDocument: () => ({ promise: Promise.resolve(fakePdfDocument()) }) });

describe("controls panel", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    root = document.querySelector("#app");
  });

  const panel = () => root.querySelector("#controls-panel");
  const toggle = () => root.querySelector("#panel-toggle");

  it("starts open by default", () => {
    setupApp(root, { storage: fakeStorage(), pdfjs: fakePdfjs() });

    expect(panel().hidden).toBe(false);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("toggle hides the panel and shows it again", () => {
    setupApp(root, { storage: fakeStorage(), pdfjs: fakePdfjs() });

    toggle().click();
    expect(panel().hidden).toBe(true);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");

    toggle().click();
    expect(panel().hidden).toBe(false);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("persists the panel state", () => {
    const storage = fakeStorage();
    setupApp(root, { storage, pdfjs: fakePdfjs() });

    toggle().click();
    expect(storage.get("panelOpen")).toBe(false);

    // A fresh app (as after reload) starts collapsed.
    document.body.innerHTML = '<main id="app"></main>';
    const root2 = document.querySelector("#app");
    setupApp(root2, { storage, pdfjs: fakePdfjs() });
    expect(root2.querySelector("#controls-panel").hidden).toBe(true);
    expect(root2.querySelector("#panel-toggle").getAttribute("aria-expanded")).toBe("false");
  });

  it("hiding the panel does not disable reading", async () => {
    const app = setupApp(root, { storage: fakeStorage(), pdfjs: fakePdfjs() });
    await app.openFile(fakeFile());

    toggle().click();
    expect(panel().hidden).toBe(true);

    // Canvas arrows live outside the panel and still navigate.
    root.querySelector("#next-page").click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(app.viewer.getState().currentPage).toBe(2);
    expect(root.querySelector("#reader-status").textContent).toMatch(/page 2 of 3/i);
  });
});
