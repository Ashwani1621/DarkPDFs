export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
export const MIN_ZOOM = ZOOM_STEPS[0];
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];
export const DEFAULT_ZOOM = 1;

export function nextZoomStep(current) {
  return ZOOM_STEPS.find((step) => step > current) ?? MAX_ZOOM;
}

export function prevZoomStep(current) {
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) {
    if (ZOOM_STEPS[i] < current) return ZOOM_STEPS[i];
  }
  return MIN_ZOOM;
}

export function fitWidthScale(containerWidth, pageWidth) {
  if (!containerWidth || !pageWidth || containerWidth <= 0 || pageWidth <= 0) {
    return DEFAULT_ZOOM;
  }
  const scale = containerWidth / pageWidth;
  return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
}

export function formatZoom(zoom) {
  return `${Math.round(zoom * 100)}%`;
}

export function createZoomController({ initialZoom = DEFAULT_ZOOM, storage, onZoomChange } = {}) {
  let zoom = initialZoom;

  function apply(next) {
    if (next === zoom) return zoom;
    zoom = next;
    storage?.set("zoom", zoom);
    onZoomChange?.(zoom);
    return zoom;
  }

  return {
    getZoom: () => zoom,
    zoomIn: () => apply(nextZoomStep(zoom)),
    zoomOut: () => apply(prevZoomStep(zoom)),
    reset: () => apply(DEFAULT_ZOOM),
    fitWidth: (containerWidth, pageWidth) => apply(fitWidthScale(containerWidth, pageWidth)),
  };
}
