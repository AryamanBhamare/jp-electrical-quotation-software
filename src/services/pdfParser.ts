// Client-side PDF text extraction using pdf.js. Works fully in the browser (no server needed),
// which keeps everything functional on Vercel's static hosting.
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PoLine } from '@shared/types';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfPageLines {
  lines: PoLine[];
  hasText: boolean;
}

export async function loadPdfDocument(arrayBuffer: ArrayBuffer) {
  const doc = await pdfjs.getDocument({ data: arrayBuffer, isEvalSupported: false, useSystemFonts: true }).promise;
  return doc;
}

/**
 * Extract positioned lines from each page of a PDF using pdf.js text layer.
 * Each PoLine carries x/y coords (PDF units) so the extractor can do positional parsing.
 */
export async function extractLinesFromPdf(arrayBuffer: ArrayBuffer, onProgress?: (done: number, total: number) => void): Promise<PdfPageLines[]> {
  const doc = await loadPdfDocument(arrayBuffer);
  const pages: PdfPageLines[] = [];
  const total = doc.numPages;
  for (let p = 1; p <= total; p++) {
    onProgress?.(p - 1, total);
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const items = content.items as Array<{
      str?: string;
      transform?: number[];
      width?: number;
      height?: number;
      hasEOL?: boolean;
    }>;

    const raw: Array<{ text: string; x: number; y: number; w: number; h: number }> = [];
    for (const it of items) {
      const text = (it.str ?? '').trim();
      if (!text) continue;
      const t = it.transform ?? [1, 0, 0, 1, 0, 0];
      const x = t[4];
      // pdf.js y grows upward from bottom; invert so top of page = 0.
      const y = viewport.height - t[5] - (it.height ?? 10);
      raw.push({ text, x, y, w: it.width ?? 0, h: it.height ?? 10 });
    }

    const lines = groupIntoLines(raw, p);
    const hasText = lines.reduce((sum, l) => sum + l.text.trim().length, 0) > 40;
    pages.push({ lines, hasText });
    onProgress?.(p, total);
  }
  await doc.destroy();
  return pages;
}

function groupIntoLines(
  raw: Array<{ text: string; x: number; y: number; w: number; h: number }>,
  page: number,
): PoLine[] {
  const sorted = [...raw].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: PoLine[] = [];
  let current: typeof sorted = [];
  let currentY = -Infinity;

  const flush = () => {
    if (current.length === 0) return;
    current.sort((a, b) => a.x - b.x);
    const text = current
      .map((c) => c.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) {
      const minX = Math.min(...current.map((c) => c.x));
      const y = current[0].y;
      const maxW = Math.max(...current.map((c) => c.x + c.w)) - minX;
      const h = Math.max(...current.map((c) => c.h));
      lines.push({ text, x: minX, y, w: maxW, h, page });
    }
    current = [];
  };

  sorted.forEach((tok) => {
    if (current.length === 0 || Math.abs(tok.y - currentY) < (tok.h || 10) * 0.6) {
      current.push(tok);
      currentY = current.length === 1 ? tok.y : (currentY + tok.y) / 2;
    } else {
      flush();
      current = [tok];
      currentY = tok.y;
    }
  });
  flush();
  return lines;
}

/** Render a PDF page to a canvas (used for OCR). */
export async function renderPageToCanvas(
  doc: pdfjs.PDFDocumentProxy,
  pageNumber: number,
  scale = 2,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export { pdfjs };
