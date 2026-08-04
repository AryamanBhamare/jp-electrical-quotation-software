// Dev tool: run the real browser extraction pipeline on a PDF from Node.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractPo } from '../src/services/extractor';
import type { PoLine } from '../shared/types';

const file = process.argv[2];
if (!file) {
  console.error('usage: npx tsx scripts/test-parse.ts <file.pdf>');
  process.exit(1);
}

const data = new Uint8Array(await import('node:fs').then((fs) => fs.readFileSync(file)));

const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;

const pages: PoLine[][] = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const items = content.items as Array<{ str?: string; transform?: number[]; width?: number; height?: number }>;

  const raw: Array<{ text: string; x: number; y: number; w: number; h: number }> = [];
  for (const it of items) {
    const text = (it.str ?? '').trim();
    if (!text) continue;
    const t = it.transform ?? [1, 0, 0, 1, 0, 0];
    const x = t[4];
    const y = viewport.height - t[5] - (it.height ?? 10);
    raw.push({ text, x, y, w: it.width ?? 0, h: it.height ?? 10 });
  }

  const sorted = [...raw].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: PoLine[] = [];
  let current: typeof sorted = [];
  let currentY = -Infinity;
  const flush = () => {
    if (current.length === 0) return;
    current.sort((a, b) => a.x - b.x);
    const text = current.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
      const minX = Math.min(...current.map((c) => c.x));
      const y = current[0].y;
      const maxW = Math.max(...current.map((c) => c.x + c.w)) - minX;
      const h = Math.max(...current.map((c) => c.h));
      lines.push({ text, x: minX, y, w: maxW, h, page: p });
    }
    current = [];
  };
  for (const tok of sorted) {
    if (current.length === 0 || Math.abs(tok.y - currentY) < (tok.h || 10) * 0.6) {
      current.push(tok);
      currentY = current.length === 1 ? tok.y : (currentY + tok.y) / 2;
    } else {
      flush();
      current = [tok];
      currentY = tok.y;
    }
  }
  flush();
  pages.push(lines);
}

console.log('--- PAGE LINES ---');
for (const [pi, page] of pages.entries()) {
  console.log(`[page ${pi + 1}]`);
  for (const l of page) console.log(`  (x=${l.x.toFixed(1)}, y=${l.y.toFixed(1)}, w=${l.w.toFixed(1)}) ${l.text}`);
}

console.log('\n--- EXTRACTED ---');
const res = extractPo(pages);
const po = res.po;
console.log('confidence:', res.confidence);
console.log('warnings:', res.warnings);
console.log('poNumber:', po.poNumber, '| poDate:', po.poDate);
console.log('customerName:', po.customerName, '| attention:', po.attention);
console.log('gstin:', po.gstin, '| phone:', po.phone, '| email:', po.email);
console.log('subTotal:', po.subTotal, '| sgst:', po.sgst, '| cgst:', po.cgst, '| igst:', po.igst, '| grandTotal:', po.grandTotal);
console.log('paymentTerms:', po.paymentTerms);
console.log('delivery:', po.deliveryTerms);
console.log('validity:', po.validity);
console.log('items:', po.items.length);
po.items.slice(0, 12).forEach((it, i) => {
  console.log(`  [${i}] desc="${it.description}" hsn=${it.hsnCode} drg=${it.drawingNo} rev=${it.revision} qty=${it.quantity} rate=${it.rate} amount=${it.amount}`);
});
await doc.destroy();
