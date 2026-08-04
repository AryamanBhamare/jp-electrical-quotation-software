// Copy the quotation as HTML (for pasting into Word/email) + standalone HTML export.
import type { Quotation } from '@shared/types';

export function quotationToStandaloneHtml(q: Quotation, docEl: HTMLElement | null): string {
  const inner = docEl?.outerHTML ?? '<p>Quotation</p>';
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(q.details.quoteNo)}</title>
<style>
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #111827; margin: 24px; }
  table { border-collapse: collapse; width: 100%; }
  .quote-doc { max-width: 794px; margin: 0 auto; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>${inner}</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function copyHtmlToClipboard(docEl: HTMLElement | null): Promise<boolean> {
  if (!docEl) return false;
  const html = docEl.outerHTML;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([`<div style="font-family:Calibri,sans-serif;">${html}</div>`], { type: 'text/html' }),
        'text/plain': new Blob([docEl.innerText], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(docEl.innerText);
      return true;
    } catch {
      return false;
    }
  }
}
