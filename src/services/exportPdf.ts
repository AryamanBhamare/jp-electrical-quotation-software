// Vector PDF export using jsPDF + autotable with automatic pagination,
// repeated table headers, header/footer on every page and page numbers.
import { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import type { Quotation, QuoteTemplate } from '@shared/types';
import { computeTotals } from '@/lib/calculations';
import { formatDate, formatNumber } from '@/lib/format';

interface ImageDims {
  w: number;
  h: number;
  type: 'PNG' | 'JPEG';
}

function loadImageDims(dataUrl: string): Promise<ImageDims> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ w: img.naturalWidth || 100, h: img.naturalHeight || 100, type: dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG' });
    img.onerror = () => resolve({ w: 100, h: 100, type: 'PNG' });
    img.src = dataUrl;
  });
}

const INK = [17, 24, 39] as const;
const SUB = [55, 65, 81] as const;

export async function buildPdf(q: Quotation, template: QuoteTemplate): Promise<Blob> {
  const totals = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
  const sym = q.details.currency === 'INR' ? '₹' : q.details.currency;
  const accent = template.accent;
  const margin = Math.max(8, template.pageMargin * 0.2646); // px → mm approx
  const pageW = 210;
  const usable = pageW - margin * 2;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica');

  const needPage = (next: number) => {
    if (next > 279 - margin) {
      doc.addPage();
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, margin, pageW - margin, margin);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...INK);
      doc.text(companyLine, margin, margin - 2);
      return margin + 6;
    }
    return next;
  };

  const companyLine = `${q.company.titlePrefix ? `${q.company.titlePrefix} ` : ''}${q.company.name || 'Company'}`;
  const contactLine = [q.company.contactPerson, q.company.phone].filter(Boolean).join(' | ');

  // ── Header: company (left) · quotation no/date (right) ─────
  let y = margin;
  const logoUrl = q.company.logo;
  if (q.showLogo && logoUrl) {
    const dims = await loadImageDims(logoUrl);
    const targetH = Math.min(16, (template.logoSize / 96) * 25.4);
    const ratio = targetH / dims.h;
    const w = Math.min(45, dims.w * ratio);
    const h = dims.h * ratio;
    doc.addImage(logoUrl, dims.type, margin, y, w, h);
    y += h + 3;
  }

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const nameLines = doc.splitTextToSize(companyLine, usable * 0.62);
  doc.text(nameLines, margin, y);
  y += nameLines.length * 4.6 + 1.2;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const headerLeft = [
    q.company.email ? `Email: ${q.company.email}` : '',
    q.company.businessDesc || '',
    q.company.address || '',
    contactLine ? `Contact: ${contactLine}` : '',
  ].filter(Boolean);
  for (const line of headerLeft) {
    const wrapped = doc.splitTextToSize(line, usable * 0.62);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.8;
  }

  // right column (quotation no / date)
  let rightY = margin + 3;
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  if (q.details.quoteNo) {
    doc.setFont('helvetica', 'normal');
    doc.text('Quotation No: ', pageW - margin, rightY, { align: 'right' });
    const w = doc.getTextWidth('Quotation No: ');
    doc.setFont('helvetica', 'bold');
    doc.text(q.details.quoteNo, pageW - margin - w, rightY, { align: 'right' });
    rightY += 4.2;
  }
  if (q.details.quoteDate) {
    doc.setFont('helvetica', 'normal');
    doc.text('Date: ', pageW - margin, rightY, { align: 'right' });
    const w = doc.getTextWidth('Date: ');
    doc.setFont('helvetica', 'bold');
    doc.text(`DT.${formatDate(q.details.quoteDate)}`, pageW - margin - w, rightY, { align: 'right' });
  }
  y = Math.max(y, rightY) + 3;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ── Customer ───────────────────────────────────────────────
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('To,', margin, y);
  y += 4;
  if (q.customer.attention) {
    doc.text(q.customer.attention, margin, y);
    y += 4;
  }
  if (q.customer.company || q.customer.name) {
    doc.setFontSize(9.5);
    doc.text(doc.splitTextToSize(q.customer.company || q.customer.name, usable), margin, y);
    y += 4.4;
  }
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  if (q.customer.address) {
    for (const line of q.customer.address.split('\n').filter(Boolean)) {
      doc.text(doc.splitTextToSize(line, usable), margin, y);
      y += 4;
    }
  }
  const cityLine = [q.customer.city, q.customer.state].filter(Boolean).join(', ');
  const cityFull = [cityLine, q.customer.pincode].filter(Boolean).join(', ');
  if (cityFull) {
    doc.text(cityFull, margin, y);
    y += 4;
  }
  const custContact = [
    q.customer.gstin ? `GSTIN: ${q.customer.gstin}` : '',
    q.customer.pan ? `PAN: ${q.customer.pan}` : '',
    q.customer.phone ? `Ph: ${q.customer.phone}` : '',
    q.customer.email ? `Email: ${q.customer.email}` : '',
  ].filter(Boolean).join('  |  ');
  if (custContact) {
    doc.setFontSize(7.5);
    doc.setTextColor(...SUB);
    doc.text(doc.splitTextToSize(custContact, usable), margin, y);
    y += 4;
  }
  y += 1;

  // ── Subject ────────────────────────────────────────────────
  if (q.details.subject) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const subjLines = doc.splitTextToSize(q.details.subject, usable - 8);
    doc.text('SUB:', margin, y);
    const subjW = doc.getTextWidth('SUB:') + 2;
    doc.text(subjLines, margin + subjW, y);
    y += Math.max(4.4, subjLines.length * 4.2);
  }

  // ── Reference ──────────────────────────────────────────────
  if (q.details.poNumber || q.details.reference) {
    const refText = q.details.poNumber
      ? `YOUR P.ORDER NO. ${q.details.poNumber}${q.details.poDate ? `  DT.${formatDate(q.details.poDate)}` : ''}`
      : q.details.reference || '';
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('REF:', margin, y);
    const refW = doc.getTextWidth('REF:') + 2;
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(refText, usable - refW), margin + refW, y);
    y += 4.4;
  }

  // ── Opening paragraph ──────────────────────────────────────
  if (q.introduction) {
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    for (const line of q.introduction.split('\n').filter(Boolean)) {
      const wrapped = doc.splitTextToSize(line, usable);
      y = needPage(y + wrapped.length * 4 + 1.2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4 + 1.2;
    }
    y += 1;
  }

  // ── Items table ────────────────────────────────────────────
  const head = [['SR NO', 'DESCRIPTION', 'HSN CODE', 'QTY', 'PRICE', 'AMOUNT']];
  const columnStyles: Record<string, { cellWidth: number; halign?: 'left' | 'center' | 'right' }> = {
    0: { cellWidth: 10 },
    1: { cellWidth: usable - 72 },
    2: { cellWidth: 16 },
    3: { cellWidth: 12 },
    4: { cellWidth: 17 },
    5: { cellWidth: 17 },
  };
  const body = q.items.map((it, i) => {
    const descParts = [it.description || ''];
    if (it.drawingNo || it.revision) descParts.push(`Drg No. ${it.drawingNo || '-'}, Rev No. ${it.revision || '-'}`);
    if (it.unit) descParts.push(`Unit: ${it.unit}`);
    return [
      String(i + 1),
      descParts.filter(Boolean).join('\n'),
      it.hsnCode || '',
      String(it.quantity ?? ''),
      it.rate ? formatNumber(it.rate) : '',
      it.amount ? it.amount.toFixed(2) : '',
    ];
  });

  const didDrawPage = (data: { pageNumber: number }) => {
    const page = data.pageNumber;
    if (page > 1) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, margin, pageW - margin, margin);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...INK);
      doc.text(companyLine, margin, margin - 2);
    }
    const foot = q.footer || `${companyLine}  •  ${q.company.phone || ''}  •  ${q.company.email || ''}`;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SUB);
    doc.text(foot, pageW / 2, 291, { align: 'center' });
    if (template.showFooterLine) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, 289.2, pageW - margin, 289.2);
    }
    doc.text(`Page ${page}`, pageW - margin, 291, { align: 'right' });
  };

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 14 },
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6, textColor: [31, 41, 55], lineColor: [148, 163, 184], lineWidth: 0.25 },
    headStyles: { fillColor: template.tableHeaderBg, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index !== 1) data.cell.styles.halign = 'center';
      if (data.section === 'body' && data.column.index >= 4) data.cell.styles.halign = 'right';
    },
    didDrawPage,
  } satisfies UserOptions);

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // ── Totals (right aligned) ─────────────────────────────────
  const totalLeft = margin + usable * 0.5;
  const totalWidth = usable * 0.5;
  const totalRows: string[][] = [['SUB TOTAL', `${sym} ${totals.subTotal.toFixed(2)}`]];
  if (totals.sgst > 0) totalRows.push([`SGST ${q.gst.sgst}%`, `${sym} ${totals.sgst.toFixed(2)}`]);
  if (totals.cgst > 0) totalRows.push([`CGST ${q.gst.cgst}%`, `${sym} ${totals.cgst.toFixed(2)}`]);
  if (totals.igst > 0) totalRows.push([`IGST ${q.gst.igst}%`, `${sym} ${totals.igst.toFixed(2)}`]);
  if (totals.discount > 0) totalRows.push([`DISCOUNT${q.discount.type === 'percent' ? ` ${q.discount.value}%` : ''}`, `- ${sym} ${totals.discount.toFixed(2)}`]);
  if (q.roundOff && totals.roundOff !== 0) totalRows.push(['ROUND OFF', `${sym} ${totals.roundOff.toFixed(2)}`]);
  totalRows.push(['GRAND TOTAL', `${sym} ${totals.rounded.toFixed(2)}`]);

  autoTable(doc, {
    startY: y,
    margin: { left: totalLeft, right: margin },
    body: totalRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.6, textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: totalWidth * 0.62, halign: 'right' }, 1: { cellWidth: totalWidth * 0.38, halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.index === totalRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = template.tableHeaderBg;
        data.cell.styles.fontSize = 9.5;
      }
    },
  } satisfies UserOptions);
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // amount in words
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  const words = doc.splitTextToSize(`Amount in Words: ${totals.amountInWords}`, usable);
  doc.text(words, margin, y);
  y += words.length * 4.2 + 3;

  // ── Terms / notes ──────────────────────────────────────────
  if (q.terms) {
    y = needPage(y + 6);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TERMS & CONDITIONS', margin, y);
    y += 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SUB);
    for (const line of q.terms.split('\n').filter(Boolean)) {
      const wrapped = doc.splitTextToSize(line, usable);
      y = needPage(y + wrapped.length * 3.8 + 1);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 3.8 + 1;
    }
    y += 2;
  }

  if (q.notes) {
    y = needPage(y + 6);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('NOTE:-', margin, y);
    y += 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SUB);
    for (const line of q.notes.split('\n').map((l) => l.replace(/^[-•*]\s*/, '')).filter(Boolean)) {
      const wrapped = doc.splitTextToSize(`• ${line}`, usable);
      y = needPage(y + wrapped.length * 3.8 + 1);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 3.8 + 1;
    }
    y += 2;
  }

  // payment meta
  const meta: Array<[string, string]> = [];
  if (q.details.paymentTerms) meta.push(['Payment Terms: ', q.details.paymentTerms]);
  if (q.details.deliveryTerms) meta.push(['Delivery: ', q.details.deliveryTerms]);
  if (q.details.freight) meta.push(['Freight: ', q.details.freight]);
  if (q.details.validity) meta.push(['Validity: ', q.details.validity]);
  for (const [label, value] of meta) {
    y = needPage(y + 4.2);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    const lw = doc.getTextWidth(label);
    doc.text(doc.splitTextToSize(value, usable - lw), margin + lw, y);
    y += 4.2;
  }

  // ── Signature (bottom right) ───────────────────────────────
  y = needPage(y + 12);
  const sigX = pageW - margin;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('THANKING YOU', sigX, y, { align: 'right' });
  y += 4.6;
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(companyLine, usable * 0.5), sigX, y, { align: 'right' });
  y += doc.splitTextToSize(companyLine, usable * 0.5).length * 3.8 + 2;
  if (q.showSignature && q.company.signatory.image) {
    const dims = await loadImageDims(q.company.signatory.image);
    const targetH = 12;
    const ratio = targetH / dims.h;
    const w = Math.min(45, dims.w * ratio);
    const h = dims.h * ratio;
    doc.addImage(q.company.signatory.image, dims.type, sigX - w, y, w, h);
    y += h + 3;
  }
  doc.setFont('helvetica', 'normal');
  doc.text(q.company.signatory.name || '', sigX, y, { align: 'right' });
  y += 3.8;
  doc.setFontSize(7.5);
  doc.setTextColor(...SUB);
  doc.text(q.company.signatory.role || '', sigX, y, { align: 'right' });
  if (q.showStamp && q.company.stamp) {
    const dims = await loadImageDims(q.company.stamp);
    const targetH = 14;
    const ratio = targetH / dims.h;
    const w = dims.w * ratio;
    const h = dims.h * ratio;
    doc.addImage(q.company.stamp, dims.type, sigX - w, y + 4, w, h);
  }

  // ── Watermark ──────────────────────────────────────────────
  if (q.watermark) {
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200);
    doc.text(q.watermark, pageW / 2, 150, { align: 'center', angle: 35 });
  }

  const blob = doc.output('blob');
  return blob;
}
