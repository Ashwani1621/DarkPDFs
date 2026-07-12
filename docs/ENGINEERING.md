# Dark PDFs — Engineering Deep Dives

Explanations of the interesting engineering inside this project: what each piece does, why it
was built that way, and the underlying browser/CS concepts. Written to be read alongside the
code — every section names the files it explains.

---

## 1. Dark mode is a lens, not a conversion

**Files:** `src/pdf-filters.js`, `src/app.js` (`applyFilterStyle`)

The selling point of this app is making any PDF readable in the dark — and the trick is that
**we never modify the PDF's pixels**. PDF.js paints the page exactly as authored (usually
black text on a blinding white background) into a `<canvas>`. Dark mode is applied *after*
rendering, as a CSS `filter` on the canvas element:

```js
if (state.invert) {
  parts.push("invert(1)", "hue-rotate(180deg)");
}
```

### Why two filters?

`invert(1)` flips every color channel (`c → 255 − c`):

| Original                      | After `invert(1)`        |
| ----------------------------- | ------------------------ |
| white background (255,255,255)| **black** ✅             |
| black text (0,0,0)            | **white** ✅             |
| blue link (0,0,255)           | yellow (255,255,0) ❌    |
| red warning (255,0,0)         | cyan (0,255,255) ❌      |

Background and text are perfect, but every *color* becomes its complement — the page looks
like a film negative. Inversion did two things at once: it flipped **lightness** (which we
want) and flipped **hue** 180° around the color wheel (which we don't).

`hue-rotate(180deg)` undoes only the hue flip:

| Original   | `invert(1)` | + `hue-rotate(180deg)`         |
| ---------- | ----------- | ------------------------------ |
| white bg   | black       | **black** (no hue to rotate) ✅|
| black text | white       | **white** ✅                   |
| blue link  | yellow      | **blue-ish, on dark** ✅       |
| red text   | cyan        | **red-ish, on dark** ✅        |

Net effect: **lightness inverted, colors approximately preserved** — which is what "dark
mode" means perceptually. This is the same recipe used by Dark Reader and iOS Smart Invert.

Caveat: CSS `hue-rotate` is a fast linear matrix approximation, not a true color-wheel
rotation, so photographs still look slightly off. That's why inversion is a *toggle*, not
always-on.

### Brightness and contrast refine the result

CSS filters apply **left to right**, so `brightness()`/`contrast()` operate on the
already-inverted page. Pure white-on-black is harsh; dropping brightness to ~0.9 gives a
softer gray-on-charcoal. `FILTER_LIMITS` clamps both to 0.5–1.5 and `clampFilters()` enforces
it on every update, so no input (`NaN`, `99`, garbage strings) can ever produce an unreadable
page.

### Why CSS filter instead of rewriting pixels?

We could loop over `getImageData()` and invert every pixel. We deliberately don't:

1. **GPU compositing** — the browser applies the filter in the compositor. Toggling invert on
   a 3000×2000 canvas is instant; a JS pixel loop would block the main thread.
2. **Zero re-render** — `applyFilterStyle()` just sets a style string. PDF.js is never
   re-invoked (compare zoom, which *must* re-render because it needs more pixels).
3. **Non-destructive** — the canvas bitmap stays pristine. Setting `filter: none` restores
   the original perfectly, proving the pixels were never touched.
4. **Trivially testable** — `toCssFilter()` is a pure function: state in, string out. Unit
   tests never need PDF.js.

---

## 2. Two independent dark systems

**Files:** `src/themes.js` + `index.css` (app theme) vs `src/pdf-filters.js` (page filter)

| System        | Mechanism                                   | Scope                     |
| ------------- | ------------------------------------------- | ------------------------- |
| **App theme** | CSS custom properties, switched via a `data-theme` attribute | toolbar, panel, backgrounds — the UI |
| **Page filter** | `canvas.style.filter` string              | only the PDF pixels       |

They never touch each other: you can read an un-inverted white page inside a Midnight-themed
app, or an inverted page in High Contrast — any combination.

The theme system's rule: **JS owns no colors.** JavaScript only flips
`document.documentElement.dataset.theme`; `index.css` owns every color through custom
properties:

```css
:root[data-theme="solarized-dark"] {
  --bg: #002b36;
  --text: #93a1a1;
  ...
}
body { background: var(--bg); color: var(--text); }
```

Adding a theme = adding one CSS block + one entry in the `THEMES` array. No component code
changes, which is why the theme unit tests can run without a PDF, a canvas, or any layout.

---

## 3. The render queue: "latest render wins"

**Files:** `src/render-queue.js`, used by `src/pdf-viewer.js`

Rendering a PDF page is **async** (parse page → compute viewport → rasterize). If the user
clicks "next" three times quickly, three renders are in flight at once — and they can finish
**out of order**. Without protection, a slow page-2 render finishing *after* a fast page-3
render would paint page 2 over page 3 while the UI says "Page 3". This is a classic race
condition (the same bug appears in autocomplete dropdowns showing results for an old query).

The fix is a token/generation check:

```js
latestKey = key;            // every new request claims the "latest" slot
const result = await renderFn();
if (key !== latestKey) return { status: "stale" };  // someone newer took over — discard
```

Each render is keyed by `page@zoom` (e.g. `"3@1.25"`). When a render finishes, it checks
whether it is still the newest request. If not, its result is labeled `stale` and the viewer
**ignores it entirely** — no state update, no status text, no canvas claim. Only the render
that's still `latestKey` when it completes gets to say "ready".

The same key doubles as **deduplication**: requesting `3@1.25` while `3@1.25` is already
rendering (or already on screen) returns `duplicate` and never calls PDF.js again.

The subtle part is testable determinism: the unit tests (`tests/unit/render-queue.test.js`)
use *deferred promises* — promises whose `resolve` is captured so the test controls exactly
when each fake render finishes. That lets us force the "slow render finishes last" ordering
deterministically instead of hoping timing works out.

---

## 4. PDF.js behind an adapter boundary + dependency injection

**Files:** `src/pdf-viewer.js`, `src/app.js` (`setupApp`), `index.js`

PDF.js is a huge library, but the app touches only four of its concepts:

```
getDocument(buffer) → doc → doc.getPage(n) → page.getViewport({scale}) / page.render({...})
```

Everything PDF.js lives inside `pdf-viewer.js` (the *adapter*). The rest of the app talks to
the viewer's own small API: `loadDocument`, `goToPage`, `nextPage`, `setZoom`, `getState`.

Crucially, nothing imports PDF.js globally — dependencies are **passed in**:

```js
setupApp(root, { storage, pdfjs });   // index.js injects the real ones
```

The payoff is in the tests: unit tests inject a *fake* PDF document —

```js
{ numPages: 3, getPage: async (n) => ({ getViewport, render }) }
```

— so 64 unit tests run in milliseconds with zero PDF parsing, and the fake can be
manipulated in ways a real PDF can't (renders that fail on demand, renders that hang until
the test releases them). The real PDF.js integration is exercised once, at the E2E layer,
with a real browser and a real file.

This is the *ports and adapters* (hexagonal) pattern at small scale: the app defines the
shape it needs; the boundary module adapts the vendor library to that shape.

---

## 5. Storage that can never crash the app

**Files:** `src/storage.js`

`localStorage` is spikier than it looks: it can **throw on access** (privacy modes, disabled
storage), **throw on write** (quota), and **return corrupt JSON** (another tab, an old
version). The wrapper treats every operation as fallible:

```js
try { raw = backend.getItem(key); } catch { return fallback; }
try { return JSON.parse(raw); } catch { return fallback; }
```

Three design points:

1. **Fallbacks at the call site** — `storage.get("zoom", 1)` always returns something usable.
   Callers never null-check.
2. **Backend injection** — `createStorage(backend)` takes anything with
   `getItem`/`setItem`. Tests inject a `Map`-based fake or a deliberately-throwing backend;
   `createDefaultStorage()` probes real `localStorage` and silently falls back to an
   in-memory backend, so the app works (without persistence) even when storage is blocked.
3. **Namespacing** — every key is prefixed (`darkpdfs:`), and per-document values get a
   second namespace layer: `darkpdfs:doc:<fingerprint>:lastPage`.

### Per-document memory via fingerprints

PDF.js computes a **fingerprint** (content hash) for every document. That gives us a stable
identity for "this PDF" regardless of filename or location — so the app can remember the last
page *per document*: reopen the same file next week and you resume where you left off, while
a different PDF starts at page 1.

One real bug lived here, caught by a unit test: the app originally persisted `lastPage: 1`
during the first render and *then* read the saved value — overwriting page 7 with page 1
before restoring it. The fix (read before first render) is a nice example of why the tests
specify behavior ("reopening restores the saved page"), not implementation.

---

## 6. The two-layer test strategy — and the gap each layer covers

**Files:** `tests/unit/**` (Vitest + jsdom), `tests/e2e/**` (Playwright)

| Layer | Speed | Validates | Can't see |
| ----- | ----- | --------- | --------- |
| Unit (jsdom) | ms, hundreds of runs | module logic, DOM structure, state machines | real rendering, CSS, `index.html` wiring |
| E2E (Playwright) | seconds | the wired app in a real browser | (expensive, so kept for behavior only) |

The unit layer runs against a **synthetic document** — jsdom builds a fake DOM in Node. That
means unit tests validate `renderAppShell()`'s *output*, but never `index.html` itself: you
could typo `<main id="ap">` and every unit test stays green while the real page is blank.

That gap is closed by one E2E test, *loads without console errors*: it collects
`pageerror`/`console.error` events while loading the real page. We proved it works by
deliberately breaking the `#app` id — the test failed, the unit suite didn't. **Know which
test protects which failure mode.**

Other E2E techniques worth stealing:

- **Racing states made observable** — "shows a loading state" can't reliably catch a
  ~50 ms status flash with polling. Instead the test installs a `MutationObserver` *inside
  the page* that logs every status change, then asserts the log contains a loading message
  (`tests/e2e/file-load.spec.js`).
- **Pixel-level canvas assertions** — "renders a non-empty canvas" reads the canvas back
  with `getImageData` and checks it contains both dark and light pixels; a blank or
  solid-color canvas fails (`tests/e2e/rendering.spec.js`).
- **Accessible queries as the default selector** — tests find controls by role and label
  (`getByRole("button", { name: /next page/i })`), so the layout rework (toolbar → side
  panel) required almost no test changes: the *behavior contract* is the accessible name,
  not the DOM position.

---

## 7. A hand-built PDF: the fixture generator

**Files:** `scripts/make-fixture-pdf.mjs` → `fixtures/sample.pdf`

E2E tests need a real PDF, but a random downloaded file is a flaky dependency. So the fixture
is *generated* — a minimal but fully valid 3-page PDF written byte-by-byte, which doubles as
a crash course in the PDF format:

- A PDF is a graph of numbered **objects**: a catalog → a page tree → page objects → content
  streams (drawing commands like `BT /F1 36 Tf 72 700 Td (Page 1) Tj ET` — "set font, move,
  draw text") → a font object.
- The end of the file has an **xref table**: the exact *byte offset* of every object, so
  readers can jump directly to any object without parsing the whole file. This is why the
  generator tracks `out.length` as it appends each object — get one offset wrong and the
  file is unreadable.
- A **trailer** points at the root object and the xref position.

The generated file is validated in Node with PDF.js itself before the E2E suite ever uses it
(`numPages === 3`). Deterministic fixture, zero external downloads, regenerable with
`npm run fixtures`.

---

## 8. Keyboard shortcuts that don't fight the browser

**Files:** `src/navigation.js`

Global key handlers have a classic failure mode: hijacking keys the user needs for typing.
Press `Home` while editing the page-number input — should that go to page 1, or move the text
cursor? (Answer: move the cursor.)

The guard is checked *before* any shortcut logic:

```js
if (isTypingTarget(event.target)) return;   // INPUT / SELECT / TEXTAREA / contentEditable
```

Because the listener is on `document` and keyboard events **bubble**, `event.target` is the
element that actually had focus — so one listener covers the whole app yet automatically
defers to every form control, including ones added later. `preventDefault()` is called only
when a shortcut actually fires, so untouched keys keep their native behavior (e.g. arrow keys
still change the `<select>` option when it has focus).

The E2E suite locks this in from both directions: arrows navigate pages when focus is on the
body, and do *not* navigate when focus is in the theme selector or page input.

---

## 9. State lives in JS; the DOM is a projection

**Files:** `src/pdf-viewer.js` (state object), `src/app.js` (`syncViewerUi`)

The viewer keeps one explicit state object:

```js
{ currentPage, totalPages, zoom, status: "empty" | "rendering" | "ready" | "error", error }
```

Every change flows one way: **action → state mutation → `onStateChange` → `syncViewerUi()`
repaints the controls** (page input value, disabled flags on prev/next, status text). The DOM
is never read back to decide anything — it is a *projection* of state, not the source of
truth. This is the core idea behind React/Redux and friends, implemented in ~20 lines of
vanilla JS. It's also what makes the status area trustworthy for accessibility: the
`role="status" aria-live="polite"` element updates from the same single path, so screen
readers announce exactly what sighted users see.

The `status` field is a tiny **finite state machine** — `empty → loading → rendering →
ready | error`, with `error → rendering` on retry. Naming the states explicitly is what made
"recovers from error after selecting another valid PDF" a one-line test.

---

*Generated during development, 2026-07-12. If you change one of these mechanisms, update its
section — this document is only useful while it's true.*
