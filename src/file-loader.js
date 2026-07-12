export function validatePdfFile(file) {
  if (!file) {
    return { ok: false, error: "No file selected." };
  }
  const hasPdfType = file.type === "application/pdf";
  const hasPdfName = /\.pdf$/i.test(file.name ?? "");
  if (!hasPdfType && !hasPdfName) {
    return { ok: false, error: `"${file.name}" is not a PDF file.` };
  }
  return { ok: true };
}

export async function readFileAsArrayBuffer(file) {
  try {
    const buffer = await file.arrayBuffer();
    return { ok: true, buffer };
  } catch (err) {
    return { ok: false, error: `Could not read "${file.name}": ${err?.message ?? "unknown error"}` };
  }
}

export async function loadPdfFile(file) {
  const valid = validatePdfFile(file);
  if (!valid.ok) return valid;
  return readFileAsArrayBuffer(file);
}

export function createFileLoader({ onChange } = {}) {
  const state = { status: "idle", error: null, buffer: null };

  function emit() {
    onChange?.({ ...state });
  }

  async function select(file) {
    state.status = "loading";
    state.error = null;
    emit();

    const result = await loadPdfFile(file);
    if (result.ok) {
      state.status = "ready";
      state.buffer = result.buffer;
      state.error = null;
    } else {
      state.status = "error";
      state.error = result.error;
      state.buffer = null;
    }
    emit();
    return { ...state };
  }

  return { select, getState: () => ({ ...state }) };
}
