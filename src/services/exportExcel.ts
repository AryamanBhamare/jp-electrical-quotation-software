// Excel (.xlsx) export of quotation data via SheetJS.
import * as XLSX from 'xlsx';
import type { Quotation } from '@shared/types';
import { computeTotals } from '@/lib/calculations';

export function quotationToWorkbook(q: Quotation): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const sym = q.details.currency === 'INR' ? '₹' : q.details.currency;
  const totals = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);

  const head: (string | number)[][] = [
    ['JP Electricals — QUOTATION', ''],
    ['Quotation No', q.details.quoteNo, 'Date', q.details.quoteDate],
    ['Customer', q.customer.company || q.customer.name, 'GSTIN', q.customer.gstin],
    ['Address', q.customer.address, 'Phone', q.customer.phone],
    ['PO No', q.details.poNumber, 'PO Date', q.details.poDate],
    ['Reference', q.details.reference, 'Validity', q.details.validity],
    [],
    ['#', 'Description', 'HSN', 'Drawing No', 'Rev', 'Unit', 'Qty', 'Rate', 'Amount'],
    ...q.items.map((it, i) => [i + 1, it.description, it.hsnCode, it.drawingNo, it.revision, it.unit, it.quantity, it.rate, it.amount]),
    [],
    ['Sub Total', '', '', '', '', '', '', '', totals.subTotal],
    ['Discount', '', '', '', '', '', '', '', totals.discount],
    ['CGST', '', '', '', '', '', '', '', totals.cgst],
    ['SGST', '', '', '', '', '', '', '', totals.sgst],
    ['IGST', '', '', '', '', '', '', '', totals.igst],
    ['Grand Total', '', '', '', '', '', '', '', totals.rounded],
    ['Amount in Words', totals.amountInWords],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(head);
  sheet['!cols'] = [
    { wch: 6 }, { wch: 45 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, 'Quotation');

  // items-only sheet
  const itemsSheet = XLSX.utils.aoa_to_sheet([
    ['#', 'Description', 'HSN', 'Drawing No', 'Rev', 'Unit', 'Qty', 'Rate', 'Amount'],
    ...q.items.map((it, i) => [i + 1, it.description, it.hsnCode, it.drawingNo, it.revision, it.unit, it.quantity, it.rate, it.amount]),
  ]);
  XLSX.utils.book_append_sheet(wb, itemsSheet, 'Items');
  return wb;
}

export function exportQuotationExcel(q: Quotation): void {
  const wb = quotationToWorkbook(q);
  XLSX.writeFile(wb, `${q.details.quoteNo}.xlsx`);
}

export function exportQuotationsExcel(list: Quotation[], filename = 'quotations.xlsx'): void {
  const wb = XLSX.utils.book_new();
  const data = list.map((q) => {
    const t = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
    return {
      'Quote No': q.details.quoteNo,
      'Date': q.details.quoteDate,
      'Customer': q.customer.name,
      'Company': q.customer.company,
      'PO No': q.details.poNumber,
      'Items': q.items.length,
      'Sub Total': t.subTotal,
      'Grand Total': t.rounded,
      'Status': q.status,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Quotations');
  XLSX.writeFile(wb, filename);
}
