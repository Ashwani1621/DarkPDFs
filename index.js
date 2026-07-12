import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { setupApp } from "./src/app.js";
import { createDefaultStorage } from "./src/storage.js";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

setupApp(document.querySelector("#app"), {
  storage: createDefaultStorage(),
  pdfjs,
});
