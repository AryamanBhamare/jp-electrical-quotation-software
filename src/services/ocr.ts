// OCR fallback for scanned PDFs using Tesseract.js (runs fully in the browser).
// The first invocation downloads the worker/wasm/language data from the CDN and caches it.
import { createWorker } from 'tesseract.js';
import { loadPdfDocument, renderPageToCanvas } from './pdfParser';
import type { PoLine } from '@shared/types';

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker(): Promise<ReturnType<typeof createWorker>> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: undefined,
      errorHandler: (err) => console.error('[ocr] worker error', err),
    });
  }
  return workerPromise;
}

export async function resetOcrWorker(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}

export async function canUseOcr(): Promise<boolean> {
  try {
    await getWorker();
    return true;
  } catch {
    return false;
  }
}

/**
 * OCR a scanned PDF, returning positioned lines per page.
 * A lightweight line grouping is derived from word boxes Tesseract reports.
 */
export async function ocrPdf(arrayBuffer: ArrayBuffer, onProgress?: (page: number, total: number) => void): Promise<PoLine[][]> {
  const doc = await loadPdfDocument(arrayBuffer);
  const worker = await getWorker();
  const total = doc.numPages;
  const pages: PoLine[][] = [];

  for (let p = 1; p <= total; p++) {
    onProgress?.(p - 1, total);
    const canvas = await renderPageToCanvas(doc, p, 2);
    const { data } = await worker.recognize(canvas);
    const lines: PoLine[] = [];
    for (const block of data.blocks ?? []) {
      for (const par of block.paragraphs ?? []) {
        for (const l of par.lines ?? []) {
          const text = l.text.trim();
          if (!text) continue;
          const words = l.words ?? [];
          const minX = words.length ? Math.min(...words.map((w) => w.bbox.x0)) : l.bbox.x0;
          const maxX = words.length ? Math.max(...words.map((w) => w.bbox.x1)) : l.bbox.x1;
          const y = l.bbox.y0;
          const h = Math.max(6, l.bbox.y1 - l.bbox.y0);
          lines.push({ text, x: minX, y, w: maxX - minX, h, page: p });
        }
      }
    }
    lines.sort((a, b) => a.y - b.y || a.x - b.x);
    pages.push(lines);
    onProgress?.(p, total);
  }
  await doc.destroy();
  return pages;
}
