export function createRenderQueue() {
  let latestKey = null;
  let completedKey = null;
  let pending = 0;

  async function request(key, renderFn) {
    const alreadyDone = completedKey === key && pending === 0;
    const alreadyRequested = latestKey === key && pending > 0;
    if (alreadyDone || alreadyRequested) {
      return { status: "duplicate" };
    }

    latestKey = key;
    pending += 1;
    try {
      const result = await renderFn();
      if (key !== latestKey) return { status: "stale" };
      completedKey = key;
      return { status: "done", result };
    } catch (error) {
      if (key !== latestKey) return { status: "stale" };
      completedKey = null;
      return { status: "error", error };
    } finally {
      pending -= 1;
    }
  }

  return {
    request,
    isIdle: () => pending === 0,
  };
}
