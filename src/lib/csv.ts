import type { AuditEntry, AnalyticsEntry, Quotation, QuoteItem } from '@shared/types';
import { computeTotals } from './calculations';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, mime = 'text/plain'): void {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

function escapeCsv(v: string | number): string {
  const s = String(v ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

export function quotationToCsv(q: Quotation): string {
  const rows: string[][] = [];
  rows.push(['JP ELECTRICALS — QUOTATION']);
  rows.push([]);
  rows.push(['Quotation No.', q.details.quoteNo, 'Date', q.details.quoteDate]);
  rows.push(['Customer', q.customer.company || q.customer.name, 'GSTIN', q.customer.gstin]);
  rows.push(['PO No.', q.details.poNumber, 'PO Date', q.details.poDate]);
  rows.push([]);
  rows.push(['Sr', 'Description', 'HSN', 'Drawing No', 'Rev', 'Qty', 'Unit', 'Rate', 'Amount']);
  q.items.forEach((it, i) => {
    rows.push([String(i + 1), it.description, it.hsnCode, it.drawingNo, it.revision, String(it.quantity), it.unit, String(it.rate), String(it.amount)]);
  });
  const totals = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
  rows.push([]);
  rows.push(['Sub Total', '', '', '', '', '', '', '', String(totals.subTotal)]);
  if (totals.discount > 0) rows.push(['Discount', '', '', '', '', '', '', '', String(totals.discount)]);
  if (totals.cgst > 0) rows.push([`CGST ${q.gst.cgst}%`, '', '', '', '', '', '', '', String(totals.cgst)]);
  if (totals.sgst > 0) rows.push([`SGST ${q.gst.sgst}%`, '', '', '', '', '', '', '', String(totals.sgst)]);
  if (totals.igst > 0) rows.push([`IGST ${q.gst.igst}%`, '', '', '', '', '', '', '', String(totals.igst)]);
  rows.push(['Grand Total', '', '', '', '', '', '', '', String(totals.rounded)]);
  rows.push(['Amount in Words', totals.amountInWords]);
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
}

export function itemsToCsv(items: QuoteItem[], currency: string): string {
  const header = ['Sr', 'Description', 'HSN', 'Drawing No', 'Rev', 'Qty', 'Unit', 'Rate', 'Amount'];
  const body = items.map((it, i) => [
    i + 1, it.description, it.hsnCode, it.drawingNo, it.revision, it.quantity, it.unit, it.rate, it.amount,
  ]);
  const rows = [header, ...body, [], ['Amount in Words', computeTotals(items, { type: 'none', cgst: 0, sgst: 0, igst: 0 }, { type: 'percent', value: 0 }, false, currency).amountInWords]];
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
}

export function auditToCsv(entries: AuditEntry[]): string {
  const rows = [['Timestamp', 'Action', 'Detail'], ...entries.map((e) => [e.at, e.action, e.detail])];
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
}

export function analyticsToCsv(entries: AnalyticsEntry[]): string {
  const rows = [['Date', 'Quotes Created', 'Quotes Exported'], ...entries.map((e) => [e.date, e.quotesCreated, e.quotesExported])];
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
}

export function quotationsToCsv(list: Quotation[]): string {
  const header = ['Quote No', 'Date', 'Customer', 'Company', 'PO No', 'Sub Total', 'Grand Total', 'Status', 'Created'];
  const rows = list.map((q) => {
    const totals = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
    return [q.details.quoteNo, q.details.quoteDate, q.customer.name, q.customer.company, q.details.poNumber, totals.subTotal, totals.rounded, q.status, q.createdAt.slice(0, 10)];
  });
  return [header, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\r\n');
}
