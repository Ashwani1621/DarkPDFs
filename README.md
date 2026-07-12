# Dark PDFs

A pdf reader for noobie coders who cant survive white screen for more than 2 seconds.

Framework-free web app for reading PDF files comfortably in the dark: multiple dark themes,
keyboard-friendly reader controls, PDF content filters (inversion, brightness, contrast), and
persisted preferences.

Built with native JavaScript. Libraries are used only where they solve a real browser problem:

- [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) — PDF parsing and rendering
- [`vitest`](https://vitest.dev) + `jsdom` — fast unit and DOM tests
- [`@playwright/test`](https://playwright.dev) — browser-level reader tests
- [`vite`](https://vite.dev) — dev server and PDF.js worker asset handling

## Run the app

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`), choose a PDF, and read.

### Features

- **Themes** — Midnight, Graphite, Sepia Dark, Solarized Dark, High Contrast. All colors live
  in CSS custom properties; JS only switches `data-theme`.
- **Navigation** — previous/next/first/last buttons, page number input, and keyboard shortcuts:
  `→`/`PageDown` next, `←`/`PageUp` previous, `Home` first, `End` last (ignored while typing).
- **Zoom** — fixed steps from 50% to 300%, reset, and fit-width.
- **PDF filters** — page inversion, brightness, and contrast, applied to the canvas only,
  independent of the app theme.
- **Reading layout** — previous/next arrows flank the page; all other controls live in a
  right side panel you can hide with the header's "Toggle controls" button (an overlay drawer
  on mobile).
- **Persistence** — theme, zoom, filters, and the panel's open/closed state are remembered
  across reloads; the last page you read is remembered per document.

## Deploy with Docker

```bash
docker build -t darkpdfs .
docker run -d -p 8080:80 darkpdfs
```

Open `http://localhost:8080`. The image is a multi-stage build (Node builds the Vite bundle,
nginx serves the ~96 MB final image): hashed assets are cached forever, `index.html` always
revalidates, and the PDF.js `.mjs` worker gets the correct MIME type (`deploy/nginx.conf`).

## Run the tests

```bash
npm test          # unit tests (Vitest + jsdom)
npm run test:e2e  # browser tests (Playwright; starts the dev server itself)
npm run test:all  # both
```

First-time Playwright setup: `npx playwright install chromium`.

The E2E tests use `fixtures/sample.pdf`, a tiny generated 3-page PDF. Regenerate it with
`npm run fixtures`.

## Project layout

```text
index.html / index.js / index.css   thin bootstrap + theme tokens
src/
  app.js          shell markup + wiring (all DOM selectors live here)
  themes.js       theme list and data-theme switching
  storage.js      safe localStorage wrapper (global + per-document values)
  file-loader.js  PDF file validation and ArrayBuffer reading
  pdf-viewer.js   PDF.js adapter: load document, render page, navigate
  render-queue.js latest-render-wins queue (no stale page flashes)
  controls.js     zoom steps and zoom controller
  navigation.js   page input parsing and keyboard shortcuts
  pdf-filters.js  canvas CSS filter state (invert/brightness/contrast)
tests/unit/       one suite per module (fake PDF documents, no PDF.js)
tests/e2e/        Playwright suites incl. main-workflow.spec.js regression
fixtures/         generated sample.pdf + not-a-pdf.txt
```

Modules receive their dependencies (storage, pdfjs, DOM elements) as arguments, so unit tests
run against fakes and never touch PDF.js internals.

## How it works

Deep dives into the interesting engineering — the invert(1)+hue-rotate(180deg) dark-mode
trick, the latest-render-wins queue, the PDF.js adapter boundary, the hand-built PDF fixture,
and more — live in [`docs/ENGINEERING.md`](docs/ENGINEERING.md).
