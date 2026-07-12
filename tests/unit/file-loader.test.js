import { describe, expect, it } from "vitest";
import { validatePdfFile, loadPdfFile, createFileLoader } from "../../src/file-loader.js";

function fakeFile({ name = "doc.pdf", type = "application/pdf", buffer, failRead = false } = {}) {
  return {
    name,
    type,
    arrayBuffer: async () => {
      if (failRead) throw new Error("disk error");
      return buffer ?? new ArrayBuffer(16);
    },
  };
}

describe("file loader", () => {
  it("accepts files with application/pdf", () => {
    expect(validatePdfFile(fakeFile()).ok).toBe(true);
  });

  it("rejects non-PDF files with a useful error message", () => {
    const result = validatePdfFile(fakeFile({ name: "notes.txt", type: "text/plain" }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/notes\.txt/);
    expect(result.error).toMatch(/not a pdf/i);
  });

  it("reads valid files as ArrayBuffer", async () => {
    const buffer = new ArrayBuffer(32);
    const result = await loadPdfFile(fakeFile({ buffer }));
    expect(result.ok).toBe(true);
    expect(result.buffer).toBe(buffer);
  });

  it("handles file read failure", async () => {
    const result = await loadPdfFile(fakeFile({ failRead: true }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/could not read/i);
  });

  it("clears previous errors when a new valid file is selected", async () => {
    const loader = createFileLoader();

    await loader.select(fakeFile({ name: "bad.txt", type: "text/plain" }));
    expect(loader.getState().status).toBe("error");
    expect(loader.getState().error).toBeTruthy();

    await loader.select(fakeFile());
    expect(loader.getState().status).toBe("ready");
    expect(loader.getState().error).toBeNull();
  });
});
