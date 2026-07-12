const PREFIX = "darkpdfs";

export function createStorage(backend, { prefix = PREFIX } = {}) {
  function fullKey(key) {
    return `${prefix}:${key}`;
  }

  function get(key, fallback = null) {
    let raw;
    try {
      raw = backend.getItem(fullKey(key));
    } catch {
      return fallback;
    }
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      backend.setItem(fullKey(key), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function getDoc(docId, key, fallback = null) {
    return get(`doc:${docId}:${key}`, fallback);
  }

  function setDoc(docId, key, value) {
    return set(`doc:${docId}:${key}`, value);
  }

  return { get, set, getDoc, setDoc };
}

function memoryBackend() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

export function createDefaultStorage() {
  let backend = null;
  try {
    backend = window.localStorage;
    // Some browsers throw on access when storage is disabled.
    backend.getItem(`${PREFIX}:probe`);
  } catch {
    backend = null;
  }
  return createStorage(backend ?? memoryBackend());
}
