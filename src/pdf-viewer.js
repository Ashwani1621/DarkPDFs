import { createRenderQueue } from "./render-queue.js";

export function createPdfViewer({ getCanvas, onStateChange } = {}) {
  const state = {
    currentPage: 0,
    totalPages: 0,
    zoom: 1,
    status: "empty",
    error: null,
  };
  let pdfDoc = null;
  let basePageWidth = null;
  const queue = createRenderQueue();

  function emit() {
    onStateChange?.({ ...state });
  }

  async function renderCurrentPage() {
    const pageNumber = state.currentPage;
    const zoom = state.zoom;
    const key = `${pageNumber}@${zoom}`;

    state.status = "rendering";
    emit();

    const outcome = await queue.request(key, async () => {
      const page = await pdfDoc.getPage(pageNumber);
      basePageWidth = page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale: zoom });
      const canvas = getCanvas();
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const canvasContext = canvas.getContext("2d");
      const task = page.render({ canvasContext, viewport });
      await task.promise;
    });

    if (outcome.status === "done" || outcome.status === "duplicate") {
      state.status = "ready";
      state.error = null;
      emit();
    } else if (outcome.status === "error") {
      state.status = "error";
      state.error = "Could not render this page.";
      emit();
    }
    // "stale" outcomes are ignored: a newer render owns the state.
    return outcome;
  }

  async function loadDocument(doc) {
    pdfDoc = doc;
    state.totalPages = doc.numPages;
    state.currentPage = 1;
    return renderCurrentPage();
  }

  async function goToPage(pageNumber) {
    if (!pdfDoc) return { status: "no-document" };
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > state.totalPages) {
      return { status: "out-of-bounds" };
    }
    state.currentPage = pageNumber;
    return renderCurrentPage();
  }

  async function setZoom(zoom) {
    state.zoom = zoom;
    if (!pdfDoc) return { status: "no-document" };
    return renderCurrentPage();
  }

  return {
    loadDocument,
    goToPage,
    nextPage: () => goToPage(state.currentPage + 1),
    prevPage: () => goToPage(state.currentPage - 1),
    setZoom,
    getState: () => ({ ...state }),
    getBasePageWidth: () => basePageWidth,
    canGoPrev: () => state.currentPage > 1,
    canGoNext: () => state.currentPage < state.totalPages,
    hasDocument: () => pdfDoc !== null,
  };
}
