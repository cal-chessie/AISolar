/**
 * pdf-probe — dump every text item and its exact position from a PDF page.
 * Used to calibrate OVERLAY_MAPS in src/lib/pdfFill.ts by MEASURING where
 * ESB's labels sit, rather than guessing coordinates.
 *
 *   node scripts/pdf-probe.mjs public/forms/esbn-form-nc6.pdf 1
 *
 * pdf.js y-origin is bottom-left, same as pdf-lib's drawText — so the y values
 * printed here map straight into OVERLAY_MAPS.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const file = process.argv[2];
const pageNo = Number(process.argv[3] || 1);
const data = new Uint8Array(fs.readFileSync(file));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const page = await doc.getPage(pageNo);
const vp = page.getViewport({ scale: 1 });
console.log(`pages=${doc.numPages}  page${pageNo}=${Math.round(vp.width)}x${Math.round(vp.height)}pt`);
const tc = await page.getTextContent();
for (const i of tc.items) {
  const s = i.str.trim();
  if (!s) continue;
  console.log(`y=${Math.round(i.transform[5])}\tx=${Math.round(i.transform[4])}\tw=${Math.round(i.width)}\t${s.slice(0, 60)}`);
}
