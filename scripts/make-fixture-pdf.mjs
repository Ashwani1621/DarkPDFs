// Generates fixtures/sample.pdf: a tiny 3-page PDF used by the E2E tests.
// Run: node scripts/make-fixture-pdf.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function buildPdf(pageCount = 3) {
  const objects = [];
  const add = (body) => objects.push(body);

  const pageObjNums = [];
  const contentObjNums = [];
  // Object numbering: 1 catalog, 2 pages, then page+content pairs, last font.
  let next = 3;
  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(next++);
    contentObjNums.push(next++);
  }
  const fontObjNum = next;

  add("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  add(`<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageCount} >>`); // 2

  for (let i = 0; i < pageCount; i++) {
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentObjNums[i]} 0 R >>`
    );
    const stream =
      `BT /F1 36 Tf 72 700 Td (Page ${i + 1} of ${pageCount}) Tj ET\n` +
      `2 w 0 0 0 RG 72 72 468 560 re S\n` +
      `BT /F1 14 Tf 90 600 Td (Dark PDFs test fixture) Tj ET\n`;
    add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  }

  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); // font

  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets[index + 1] = out.length;
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

mkdirSync(join(root, "fixtures"), { recursive: true });
writeFileSync(join(root, "fixtures", "sample.pdf"), buildPdf(3));
writeFileSync(join(root, "fixtures", "not-a-pdf.txt"), "This is definitely not a PDF.\n");
console.log("Wrote fixtures/sample.pdf and fixtures/not-a-pdf.txt");
