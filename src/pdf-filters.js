export const FILTER_LIMITS = {
  brightness: { min: 0.5, max: 1.5 },
  contrast: { min: 0.5, max: 1.5 },
};

export const DEFAULT_FILTERS = Object.freeze({
  invert: false,
  brightness: 1,
  contrast: 1,
});

function clampValue(value, { min, max }, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

export function clampFilters(state) {
  return {
    invert: Boolean(state.invert),
    brightness: clampValue(state.brightness, FILTER_LIMITS.brightness, DEFAULT_FILTERS.brightness),
    contrast: clampValue(state.contrast, FILTER_LIMITS.contrast, DEFAULT_FILTERS.contrast),
  };
}

export function toCssFilter(state) {
  const parts = [];
  if (state.invert) {
    // hue-rotate keeps colors recognizable after inversion.
    parts.push("invert(1)", "hue-rotate(180deg)");
  }
  if (state.brightness !== 1) parts.push(`brightness(${state.brightness})`);
  if (state.contrast !== 1) parts.push(`contrast(${state.contrast})`);
  return parts.length ? parts.join(" ") : "none";
}

export function createFilterController({ initial, storage, onChange } = {}) {
  let state = clampFilters({ ...DEFAULT_FILTERS, ...initial });

  function update(patch) {
    state = clampFilters({ ...state, ...patch });
    storage?.set("pdfFilters", state);
    onChange?.({ ...state }, toCssFilter(state));
    return { ...state };
  }

  return {
    getState: () => ({ ...state }),
    getCssFilter: () => toCssFilter(state),
    setInvert: (value) => update({ invert: value }),
    toggleInvert: () => update({ invert: !state.invert }),
    setBrightness: (value) => update({ brightness: value }),
    setContrast: (value) => update({ contrast: value }),
    reset: () => update({ ...DEFAULT_FILTERS }),
  };
}
