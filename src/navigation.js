export function parsePageInput(value, totalPages) {
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(num) || num < 1 || num > totalPages) {
    return { ok: false };
  }
  return { ok: true, page: num };
}

const TYPING_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

export function isTypingTarget(el) {
  return Boolean(el && (TYPING_TAGS.has(el.tagName) || el.isContentEditable));
}

const KEY_ACTIONS = {
  ArrowRight: "next",
  PageDown: "next",
  ArrowLeft: "prev",
  PageUp: "prev",
  Home: "first",
  End: "last",
};

export function setupKeyboardShortcuts(target, actions) {
  function onKeyDown(event) {
    if (isTypingTarget(event.target)) return;
    const name = KEY_ACTIONS[event.key];
    const action = name && actions[name];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  target.addEventListener("keydown", onKeyDown);
  return () => target.removeEventListener("keydown", onKeyDown);
}
