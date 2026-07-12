import { describe, expect, it } from "vitest";
import { createStorage } from "../../src/storage.js";

function mapBackend() {
  const store = new Map();
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

function brokenBackend() {
  return {
    getItem: () => {
      throw new Error("storage disabled");
    },
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };
}

describe("storage", () => {
  it("saves and reads a primitive preference", () => {
    const storage = createStorage(mapBackend());
    storage.set("zoom", 1.5);
    expect(storage.get("zoom")).toBe(1.5);
  });

  it("returns defaults when no preference exists", () => {
    const storage = createStorage(mapBackend());
    expect(storage.get("theme", "midnight")).toBe("midnight");
    expect(storage.get("missing")).toBeNull();
  });

  it("ignores invalid stored JSON", () => {
    const backend = mapBackend();
    backend.store.set("darkpdfs:theme", "{not json!");
    const storage = createStorage(backend);
    expect(storage.get("theme", "midnight")).toBe("midnight");
  });

  it("handles read/write errors gracefully", () => {
    const storage = createStorage(brokenBackend());
    expect(storage.get("theme", "midnight")).toBe("midnight");
    expect(storage.set("theme", "graphite")).toBe(false);
  });

  it("stores per-document values separately from global values", () => {
    const storage = createStorage(mapBackend());
    storage.set("lastPage", 1);
    storage.setDoc("doc-a", "lastPage", 7);
    storage.setDoc("doc-b", "lastPage", 3);

    expect(storage.get("lastPage")).toBe(1);
    expect(storage.getDoc("doc-a", "lastPage")).toBe(7);
    expect(storage.getDoc("doc-b", "lastPage")).toBe(3);
    expect(storage.getDoc("doc-c", "lastPage", null)).toBeNull();
  });
});
