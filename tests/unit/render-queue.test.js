import { describe, expect, it, vi } from "vitest";
import { createRenderQueue } from "../../src/render-queue.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("render queue", () => {
  it("only the latest requested render wins", async () => {
    const queue = createRenderQueue();
    const slow = deferred();
    const fast = deferred();

    const first = queue.request("page-1", () => slow.promise);
    const second = queue.request("page-2", () => fast.promise);

    fast.resolve();
    slow.resolve();

    expect((await first).status).toBe("stale");
    expect((await second).status).toBe("done");
  });

  it("does not start duplicate renders for the same page and zoom", async () => {
    const queue = createRenderQueue();
    const renderFn = vi.fn().mockResolvedValue(undefined);

    await queue.request("1@1", renderFn);
    const duplicate = await queue.request("1@1", renderFn);

    expect(duplicate.status).toBe("duplicate");
    expect(renderFn).toHaveBeenCalledTimes(1);
  });

  it("skips duplicates while the same render is still in flight", async () => {
    const queue = createRenderQueue();
    const pending = deferred();
    const renderFn = vi.fn(() => pending.promise);

    const first = queue.request("1@1", renderFn);
    const second = queue.request("1@1", renderFn);

    pending.resolve();

    expect((await second).status).toBe("duplicate");
    expect((await first).status).toBe("done");
    expect(renderFn).toHaveBeenCalledTimes(1);
  });

  it("marks render as idle after success or failure", async () => {
    const queue = createRenderQueue();

    await queue.request("ok", async () => {});
    expect(queue.isIdle()).toBe(true);

    const failed = await queue.request("boom", async () => {
      throw new Error("render failed");
    });
    expect(failed.status).toBe("error");
    expect(queue.isIdle()).toBe(true);
  });
});
