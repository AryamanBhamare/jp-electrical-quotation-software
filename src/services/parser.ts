// Orchestrates PDF parsing: try text layer → fall back to OCR for scanned files.
import { extractLinesFromPdf } from './pdfParser';
import { ocrPdf, resetOcrWorker } from './ocr';
import { extractPo, type ExtractionResult } from './extractor';
import type { PoLine } from '@shared/types';

export interface ParseOutcome {
  pages: PoLine[][];
  method: 'text' | 'ocr';
  result: ExtractionResult;
  fileName: string;
}

export interface ParseProgress {
  stage: 'reading' | 'extracting' | 'ocr' | 'done' | 'error';
  page: number;
  total: number;
  message: string;
}

const EMPTY_RESULT: ExtractionResult = {
  po: { items: [] },
  confidence: 0,
  warnings: ['No data could be extracted from this PDF.'],
};

export async function parsePdfFile(
  file: File,
  onProgress?: (p: ParseProgress) => void,
  options?: { forceOcr?: boolean },
): Promise<ParseOutcome> {
  onProgress?.({ stage: 'reading', page: 0, total: 1, message: 'Reading PDF…' });
  const arrayBuffer = await file.arrayBuffer();

  let pages: PoLine[][];
  let method: 'text' | 'ocr' = 'text';

  const textPages = await extractLinesFromPdf(arrayBuffer, (done, total) =>
    onProgress?.({ stage: 'extracting', page: done, total, message: 'Extracting text…' }),
  );

  const needsOcr =
    options?.forceOcr === true ||
    textPages.every((p) => !p.hasText) ||
    textPages.reduce((s, p) => s + p.lines.reduce((x, l) => x + l.text.length, 0), 0) < 30;

  if (needsOcr) {
    method = 'ocr';
    onProgress?.({ stage: 'ocr', page: 0, total: textPages.length, message: 'Running OCR on scanned document…' });
    try {
      pages = await ocrPdf(arrayBuffer, (done, total) =>
        onProgress?.({ stage: 'ocr', page: done, total, message: 'Recognizing text…' }),
      );
    } catch (err) {
      // OCR unavailable → fall back to whatever tiny text we have.
      pages = textPages.map((p) => p.lines);
      onProgress?.({ stage: 'error', page: 0, total: 1, message: `OCR failed (${(err as Error).message}). Using raw text.` });
    }
  } else {
    pages = textPages.map((p) => p.lines);
  }

  onProgress?.({ stage: 'done', page: pages.length, total: pages.length, message: 'Analyzing layout…' });

  let result: ExtractionResult;
  try {
    result = extractPo(pages);
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('[parser] extractPo failed — returning empty result', err);
    result = { ...EMPTY_RESULT, po: { items: pages.flat().map((l) => ({ description: l.text })) } };
  }

  return { pages, method, result, fileName: file.name };
}

export function resetParserWorkers(): void {
  void resetOcrWorker();
}
