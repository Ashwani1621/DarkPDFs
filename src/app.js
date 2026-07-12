import { DEFAULT_THEME, setupThemeSelector } from "./themes.js";
import { loadPdfFile } from "./file-loader.js";
import { createPdfViewer } from "./pdf-viewer.js";
import { DEFAULT_ZOOM, createZoomController, formatZoom } from "./controls.js";
import { parsePageInput, setupKeyboardShortcuts } from "./navigation.js";
import { DEFAULT_FILTERS, FILTER_LIMITS, createFilterController } from "./pdf-filters.js";

export function renderAppShell(root) {
  root.innerHTML = `
    <header class="app-header">
      <h1>Dark PDFs</h1>
      <button type="button" id="panel-toggle" aria-expanded="true" aria-controls="controls-panel">
        Toggle controls
      </button>
    </header>
    <div class="app-layout">
      <section id="reader" class="reader">
        <p id="reader-status" role="status" aria-live="polite">No PDF loaded</p>
        <div class="canvas-row">
          <button type="button" id="prev-page" class="page-arrow" aria-label="Previous page" disabled>&#8249;</button>
          <div id="canvas-container" class="canvas-container"></div>
          <button type="button" id="next-page" class="page-arrow" aria-label="Next page" disabled>&#8250;</button>
        </div>
      </section>
      <aside id="controls-panel" class="controls-panel" aria-label="Reader controls">
        <div class="panel-group">
          <label for="pdf-input">Choose PDF</label>
          <input id="pdf-input" type="file" accept="application/pdf" />
        </div>
        <div class="panel-group">
          <label for="theme-select">Theme</label>
          <select id="theme-select"></select>
        </div>
        <div class="panel-group">
          <label for="page-input">Page</label>
          <div class="panel-row">
            <input id="page-input" type="number" min="1" inputmode="numeric" disabled />
            <span id="page-count">of –</span>
          </div>
          <div class="panel-row">
            <button type="button" id="first-page" disabled>First page</button>
            <button type="button" id="last-page" disabled>Last page</button>
          </div>
        </div>
        <div class="panel-group">
          <span class="panel-heading" id="zoom-heading">Zoom</span>
          <div class="panel-row">
            <button type="button" id="zoom-out">Zoom out</button>
            <span id="zoom-label">100%</span>
            <button type="button" id="zoom-in">Zoom in</button>
          </div>
          <div class="panel-row">
            <button type="button" id="zoom-reset">Reset zoom</button>
            <button type="button" id="fit-width">Fit width</button>
          </div>
        </div>
        <div class="panel-group">
          <span class="panel-heading">Page filters</span>
          <div class="panel-row">
            <label for="invert-toggle">Invert pages</label>
            <input id="invert-toggle" type="checkbox" />
          </div>
          <label for="brightness-slider">Brightness</label>
          <input id="brightness-slider" type="range"
            min="${FILTER_LIMITS.brightness.min}" max="${FILTER_LIMITS.brightness.max}" step="0.05" value="1" />
          <label for="contrast-slider">Contrast</label>
          <input id="contrast-slider" type="range"
            min="${FILTER_LIMITS.contrast.min}" max="${FILTER_LIMITS.contrast.max}" step="0.05" value="1" />
          <button type="button" id="filters-reset">Reset filters</button>
        </div>
      </aside>
    </div>
  `;
  return root;
}

export function setupApp(root, { storage, pdfjs } = {}) {
  renderAppShell(root);
  const $ = (selector) => root.querySelector(selector);
  const els = {
    fileInput: $("#pdf-input"),
    themeSelect: $("#theme-select"),
    firstPage: $("#first-page"),
    prevPage: $("#prev-page"),
    pageInput: $("#page-input"),
    pageCount: $("#page-count"),
    nextPage: $("#next-page"),
    lastPage: $("#last-page"),
    zoomOut: $("#zoom-out"),
    zoomLabel: $("#zoom-label"),
    zoomIn: $("#zoom-in"),
    zoomReset: $("#zoom-reset"),
    fitWidth: $("#fit-width"),
    invertToggle: $("#invert-toggle"),
    brightnessSlider: $("#brightness-slider"),
    contrastSlider: $("#contrast-slider"),
    filtersReset: $("#filters-reset"),
    status: $("#reader-status"),
    canvasContainer: $("#canvas-container"),
    panel: $("#controls-panel"),
    panelToggle: $("#panel-toggle"),
  };

  let canvas = null;
  let currentFingerprint = null;

  function setStatus(text) {
    els.status.textContent = text;
  }

  // --- Controls panel (collapsible, state persisted) ---
  function setPanelOpen(open) {
    // hidden -> display:none, which also removes the panel from tab order.
    els.panel.hidden = !open;
    els.panelToggle.setAttribute("aria-expanded", String(open));
    storage?.set("panelOpen", open);
  }
  setPanelOpen(storage?.get("panelOpen", true) ?? true);
  els.panelToggle.addEventListener("click", () => setPanelOpen(els.panel.hidden));

  // --- Theme ---
  setupThemeSelector(els.themeSelect, {
    initialTheme: storage?.get("theme", DEFAULT_THEME) ?? DEFAULT_THEME,
    onChange: (theme) => storage?.set("theme", theme),
  });

  // --- PDF content filters (independent from the app theme) ---
  const filters = createFilterController({
    initial: storage?.get("pdfFilters", DEFAULT_FILTERS) ?? DEFAULT_FILTERS,
    storage,
    onChange: () => {
      applyFilterStyle();
      syncFilterControls();
    },
  });

  function applyFilterStyle() {
    if (canvas) canvas.style.filter = filters.getCssFilter();
  }

  function syncFilterControls() {
    const state = filters.getState();
    els.invertToggle.checked = state.invert;
    els.brightnessSlider.value = String(state.brightness);
    els.contrastSlider.value = String(state.contrast);
  }
  syncFilterControls();

  els.invertToggle.addEventListener("change", () => filters.setInvert(els.invertToggle.checked));
  els.brightnessSlider.addEventListener("input", () => filters.setBrightness(els.brightnessSlider.value));
  els.contrastSlider.addEventListener("input", () => filters.setContrast(els.contrastSlider.value));
  els.filtersReset.addEventListener("click", () => filters.reset());

  // --- Viewer ---
  function ensureCanvas() {
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", "PDF page");
      els.canvasContainer.appendChild(canvas);
      applyFilterStyle();
    }
    return canvas;
  }

  const viewer = createPdfViewer({
    getCanvas: ensureCanvas,
    onStateChange: syncViewerUi,
  });

  function syncViewerUi(state) {
    const hasDoc = state.totalPages > 0;
    els.firstPage.disabled = !hasDoc || !viewer.canGoPrev();
    els.prevPage.disabled = !hasDoc || !viewer.canGoPrev();
    els.nextPage.disabled = !hasDoc || !viewer.canGoNext();
    els.lastPage.disabled = !hasDoc || !viewer.canGoNext();
    els.pageInput.disabled = !hasDoc;

    if (hasDoc) {
      els.pageInput.value = String(state.currentPage);
      els.pageInput.max = String(state.totalPages);
      els.pageCount.textContent = `of ${state.totalPages}`;
    }

    if (state.status === "ready") {
      setStatus(`Page ${state.currentPage} of ${state.totalPages}`);
      if (currentFingerprint) {
        storage?.setDoc(currentFingerprint, "lastPage", state.currentPage);
      }
    } else if (state.status === "error") {
      setStatus(state.error ?? "Something went wrong while rendering.");
    } else if (state.status === "rendering") {
      setStatus("Rendering page…");
    }
  }

  // --- Zoom ---
  const zoom = createZoomController({
    initialZoom: storage?.get("zoom", DEFAULT_ZOOM) ?? DEFAULT_ZOOM,
    storage,
    onZoomChange: (value) => {
      els.zoomLabel.textContent = formatZoom(value);
      viewer.setZoom(value);
    },
  });
  els.zoomLabel.textContent = formatZoom(zoom.getZoom());
  viewer.setZoom(zoom.getZoom());

  els.zoomIn.addEventListener("click", () => zoom.zoomIn());
  els.zoomOut.addEventListener("click", () => zoom.zoomOut());
  els.zoomReset.addEventListener("click", () => zoom.reset());
  els.fitWidth.addEventListener("click", () => {
    const pageWidth = viewer.getBasePageWidth();
    const containerWidth = els.canvasContainer.clientWidth;
    if (pageWidth && containerWidth) {
      zoom.fitWidth(containerWidth, pageWidth);
    }
  });

  // --- Navigation ---
  els.firstPage.addEventListener("click", () => viewer.goToPage(1));
  els.prevPage.addEventListener("click", () => viewer.prevPage());
  els.nextPage.addEventListener("click", () => viewer.nextPage());
  els.lastPage.addEventListener("click", () => viewer.goToPage(viewer.getState().totalPages));

  els.pageInput.addEventListener("change", () => {
    const state = viewer.getState();
    const parsed = parsePageInput(els.pageInput.value, state.totalPages);
    if (parsed.ok) {
      viewer.goToPage(parsed.page);
    } else {
      // Invalid input: restore the current page.
      els.pageInput.value = state.totalPages > 0 ? String(state.currentPage) : "";
    }
  });

  const removeShortcuts = setupKeyboardShortcuts(root.ownerDocument, {
    next: () => viewer.nextPage(),
    prev: () => viewer.prevPage(),
    first: () => viewer.goToPage(1),
    last: () => viewer.goToPage(viewer.getState().totalPages),
  });

  // --- File loading ---
  async function openFile(file) {
    setStatus("Loading PDF…");
    const result = await loadPdfFile(file);
    if (!result.ok) {
      setStatus(result.error);
      return { ok: false, error: result.error };
    }

    try {
      const doc = await pdfjs.getDocument({ data: result.buffer }).promise;
      currentFingerprint = doc.fingerprints?.[0] ?? null;
      // Read the saved page before the first render persists page 1 over it.
      const lastPage = currentFingerprint
        ? storage?.getDoc(currentFingerprint, "lastPage", null)
        : null;
      ensureCanvas();
      await viewer.loadDocument(doc);

      if (lastPage && lastPage > 1 && lastPage <= doc.numPages) {
        await viewer.goToPage(lastPage);
      }
      return { ok: true };
    } catch (err) {
      const message = `Could not open PDF: ${err?.message ?? "unknown error"}`;
      setStatus(message);
      return { ok: false, error: message };
    }
  }

  els.fileInput.addEventListener("change", async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    await openFile(file);
    // Allow re-selecting the same file after errors.
    els.fileInput.value = "";
  });

  return {
    els,
    viewer,
    zoom,
    filters,
    openFile,
    destroy: removeShortcuts,
  };
}
