import { describe, expect, it, vi } from "vitest";
import { createPdfViewer } from "../../src/pdf-viewer.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeCanvas() {
  return { width: 0, height: 0, style: {}, getContext: vi.fn(() => "fake-2d-context") };
}

// Mimics the PDF.js document API surface the viewer uses.
function fakePdfDocument({ numPages = 3, renderControl } = {}) {
  const renderCalls = [];
  const getPage = vi.fn(async (pageNumber) => ({
    getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
    render: (params) => {
      renderCalls.push({ pageNumber, params });
      const control = renderControl?.(pageNumber);
      return { promise: control ? control.promise : Promise.resolve() };
    },
  }));
  return { numPages, getPage, renderCalls };
}

describe("pdf viewer", () => {
  it("initializes with page 1 after loading a document", async () => {
    const viewer = createPdfViewer({ getCanvas: fakeCanvas });
    await viewer.loadDocument(fakePdfDocument());

    const state = viewer.getState();
    expect(state.currentPage).toBe(1);
    expect(state.totalPages).toBe(3);
    expect(state.status).toBe("ready");
  });

  it("requests the correct page from the pdf document", async () => {
    const doc = fakePdfDocument();
    const viewer = createPdfViewer({ getCanvas: fakeCanvas });
    await viewer.loadDocument(doc);
    await viewer.goToPage(3);

    expect(doc.getPage).toHaveBeenCalledWith(1);
    expect(doc.getPage).toHaveBeenCalledWith(3);
  });

  it("renders to the provided canvas context", async () => {
    const canvas = fakeCanvas();
    const doc = fakePdfDocument();
    const viewer = createPdfViewer({ getCanvas: () => canvas });
    await viewer.loadDocument(doc);

    expect(canvas.getContext).toHaveBeenCalledWith("2d");
    expect(doc.renderCalls[0].params.canvasContext).toBe("fake-2d-context");
    expect(canvas.width).toBe(612);
    expect(canvas.height).toBe(792);
  });

  it("updates page status after render", async () => {
    const states = [];
    const viewer = createPdfViewer({
      getCanvas: fakeCanvas,
      onStateChange: (s) => states.push(s),
    });
    await viewer.loadDocument(fakePdfDocument());
    await viewer.nextPage();

    const last = states.at(-1);
    expect(last.status).toBe("ready");
    expect(last.currentPage).toBe(2);
  });

  it("reports boundaries so previous is disabled on page 1 and next on the last page", async () => {
    const viewer = createPdfViewer({ getCanvas: fakeCanvas });
    await viewer.loadDocument(fakePdfDocument({ numPages: 2 }));

    expect(viewer.canGoPrev()).toBe(false);
    expect(viewer.canGoNext()).toBe(true);

    await viewer.goToPage(2);
    expect(viewer.canGoPrev()).toBe(true);
    expect(viewer.canGoNext()).toBe(false);
  });

  it("refuses navigation outside valid bounds", async () => {
    const viewer = createPdfViewer({ getCanvas: fakeCanvas });
    await viewer.loadDocument(fakePdfDocument({ numPages: 2 }));

    expect((await viewer.goToPage(0)).status).toBe("out-of-bounds");
    expect((await viewer.goToPage(3)).status).toBe("out-of-bounds");
    expect(viewer.getState().currentPage).toBe(1);
  });

  it("ignores stale renders when the user navigates quickly", async () => {
    const controls = new Map();
    const doc = fakePdfDocument({
      renderControl: (pageNumber) => {
        const control = deferred();
        controls.set(pageNumber, control);
        return control;
      },
    });
    const states = [];
    const viewer = createPdfViewer({
      getCanvas: fakeCanvas,
      onStateChange: (s) => states.push(s),
    });

    // getPage is async, so the render task appears one microtask later.
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const load = viewer.loadDocument(doc);
    await flush();
    controls.get(1).resolve();
    await load;

    // Navigate quickly: page 2 render is slow, page 3 finishes first.
    const toPage2 = viewer.goToPage(2);
    const toPage3 = viewer.goToPage(3);
    await flush();
    controls.get(3).resolve();
    await toPage3;
    controls.get(2).resolve();
    await toPage2;

    const state = viewer.getState();
    expect(state.currentPage).toBe(3);
    expect(state.status).toBe("ready");
    // No "ready" emission may claim page 2 after page 3 completed.
    const readyPages = states.filter((s) => s.status === "ready").map((s) => s.currentPage);
    expect(readyPages.at(-1)).toBe(3);
  });

  it("shows a render error state if page rendering fails", async () => {
    const control = deferred();
    const doc = fakePdfDocument({ renderControl: () => control });
    const viewer = createPdfViewer({ getCanvas: fakeCanvas });

    const load = viewer.loadDocument(doc);
    control.reject(new Error("corrupt page"));
    await load;

    const state = viewer.getState();
    expect(state.status).toBe("error");
    expect(state.error).toMatch(/could not render/i);
  });
});
