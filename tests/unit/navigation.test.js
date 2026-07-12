import { describe, expect, it, beforeEach, vi } from "vitest";
import { parsePageInput, setupKeyboardShortcuts } from "../../src/navigation.js";

describe("page input parsing", () => {
  it("accepts valid page numbers", () => {
    expect(parsePageInput("1", 10)).toEqual({ ok: true, page: 1 });
    expect(parsePageInput("10", 10)).toEqual({ ok: true, page: 10 });
    expect(parsePageInput(" 5 ", 10)).toEqual({ ok: true, page: 5 });
  });

  it("rejects 0, negatives, decimals, and pages beyond total pages", () => {
    expect(parsePageInput("0", 10).ok).toBe(false);
    expect(parsePageInput("-3", 10).ok).toBe(false);
    expect(parsePageInput("2.5", 10).ok).toBe(false);
    expect(parsePageInput("11", 10).ok).toBe(false);
    expect(parsePageInput("abc", 10).ok).toBe(false);
    expect(parsePageInput("", 10).ok).toBe(false);
  });
});

describe("keyboard shortcuts", () => {
  let actions;
  let teardown;

  beforeEach(() => {
    document.body.innerHTML = "<input id='field' /><div id='content'></div>";
    actions = { next: vi.fn(), prev: vi.fn(), first: vi.fn(), last: vi.fn() };
    teardown?.();
    teardown = setupKeyboardShortcuts(document, actions);
  });

  function press(key, target = document.body) {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }

  it("calls the correct navigation actions", () => {
    press("ArrowRight");
    press("PageDown");
    expect(actions.next).toHaveBeenCalledTimes(2);

    press("ArrowLeft");
    press("PageUp");
    expect(actions.prev).toHaveBeenCalledTimes(2);

    press("Home");
    expect(actions.first).toHaveBeenCalledTimes(1);

    press("End");
    expect(actions.last).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts when focus is inside an input", () => {
    const input = document.querySelector("#field");
    press("ArrowRight", input);
    press("Home", input);

    expect(actions.next).not.toHaveBeenCalled();
    expect(actions.first).not.toHaveBeenCalled();
  });

  it("ignores unrelated keys", () => {
    press("a");
    press("Enter");
    expect(actions.next).not.toHaveBeenCalled();
    expect(actions.prev).not.toHaveBeenCalled();
  });

  it("stops listening after teardown", () => {
    teardown();
    teardown = null;
    press("ArrowRight");
    expect(actions.next).not.toHaveBeenCalled();
  });
});
