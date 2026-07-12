import { describe, expect, it, beforeEach, vi } from "vitest";
import { setupApp } from "../../src/app.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeFile({ name = "doc.pdf", type = "application/pdf" } = {}) {
  return { name, type, arrayBuffer: async () => new ArrayBuffer(16) };
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

function fakeStorage() {
  const store = new Map();
  return {
    get: (key, fallback = null) => (store.has(key) ? store.get(key) : fallback),
    set: (key, value) => store.set(key, value),
    getDoc: (docId, key, fallback = null) =>
      store.has(`doc:${docId}:${key}`) ? store.get(`doc:${docId}:${key}`) : fallback,
    setDoc: (docId, key, value) => store.set(`doc:${docId}:${key}`, value),
  };
}

function fakePdfjs(docFactory = () => Promise.resolve(fakePdfDocument())) {
  return { getDocument: vi.fn(() => ({ promise: docFactory() })) };
}

describe("app status states", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    root = document.querySelector("#app");
  });

  const statusText = () => root.querySelector("#reader-status").textContent;

  it("shows empty state before upload", () => {
    setupApp(root, { storage: fakeStorage(), pdfjs: fakePdfjs() });
    expect(statusText()).toMatch(/no pdf loaded/i);
  });

  it("shows loading state while loading a pdf", async () => {
    const docControl = deferred();
    const app = setupApp(root, {
      storage: fakeStorage(),
      pdfjs: fakePdfjs(() => docControl.promise),
    });

    const opening = app.openFile(fakeFile());
    await Promise.resolve();
    expect(statusText()).toMatch(/loading/i);

    docControl.resolve(fakePdfDocument());
    await opening;
    expect(statusText()).toMatch(/page 1 of 3/i);
  });

  it("shows an error when pdf parsing fails", async () => {
    const app = setupApp(root, {
      storage: fakeStorage(),
      pdfjs: fakePdfjs(() => Promise.reject(new Error("bad xref table"))),
    });

    const result = await app.openFile(fakeFile());
    expect(result.ok).toBe(false);
    expect(statusText()).toMatch(/could not open pdf/i);
  });

  it("shows an error for invalid files without touching pdf.js", async () => {
    const pdfjs = fakePdfjs();
    const app = setupApp(root, { storage: fakeStorage(), pdfjs });

    await app.openFile(fakeFile({ name: "notes.txt", type: "text/plain" }));

    expect(statusText()).toMatch(/not a pdf/i);
    expect(pdfjs.getDocument).not.toHaveBeenCalled();
    expect(root.querySelector("canvas")).toBeNull();
  });

  it("recovers from error after selecting another valid pdf", async () => {
    let fail = true;
    const app = setupApp(root, {
      storage: fakeStorage(),
      pdfjs: fakePdfjs(() =>
        fail ? Promise.reject(new Error("broken")) : Promise.resolve(fakePdfDocument())
      ),
    });

    await app.openFile(fakeFile());
    expect(statusText()).toMatch(/could not open pdf/i);

    fail = false;
    await app.openFile(fakeFile());
    expect(statusText()).toMatch(/page 1 of 3/i);
  });

  it("announces page changes through an aria-live status element", async () => {
    const app = setupApp(root, { storage: fakeStorage(), pdfjs: fakePdfjs() });
    const status = root.querySelector("#reader-status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("role")).toBe("status");

    await app.openFile(fakeFile());
    await app.viewer.nextPage();
    expect(status.textContent).toMatch(/page 2 of 3/i);
  });

  it("remembers the last page per document fingerprint", async () => {
    const storage = fakeStorage();
    const app = setupApp(root, { storage, pdfjs: fakePdfjs() });

    await app.openFile(fakeFile());
    await app.viewer.goToPage(3);
    expect(storage.getDoc("fingerprint-abc", "lastPage")).toBe(3);

    // Reopening the same document restores the saved page.
    document.body.innerHTML = '<main id="app"></main>';
    const root2 = document.querySelector("#app");
    const app2 = setupApp(root2, { storage, pdfjs: fakePdfjs() });
    await app2.openFile(fakeFile());
    expect(app2.viewer.getState().currentPage).toBe(3);
  });
});
