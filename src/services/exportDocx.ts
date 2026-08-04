// Word (.docx) export using the `docx` library — produces a fully editable document
// (tables, fonts, borders, margins, header/footer, page numbers all preserved).
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { Quotation, QuoteTemplate } from '@shared/types';
import { computeTotals } from '@/lib/calculations';
import { formatDate, formatNumber } from '@/lib/format';

const MM_TO_TWIPS = 56.6929;

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const [, b64] = dataUrl.split(',');
  const bin = atob(b64 ?? '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function imageType(dataUrl: string): 'png' | 'jpg' {
  return dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
}

type DocxAlign = (typeof AlignmentType)[keyof typeof AlignmentType];

function run(text: string, opts: { bold?: boolean; size?: number; color?: string; italic?: boolean } = {}): TextRun {
  return new TextRun({ text: text || '', bold: opts.bold, italics: opts.italic, size: opts.size ?? 20, color: opts.color, font: 'Calibri' });
}

function para(children: TextRun | TextRun[], opts: { align?: DocxAlign; before?: number; after?: number; keep?: boolean } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: opts.before, after: opts.after },
    keepNext: opts.keep,
    children: Array.isArray(children) ? children : [children],
  });
}

function cell(text: string, opts: { bold?: boolean; align?: DocxAlign; width?: string; bg?: string; size?: number } = {}): TableCell {
  return new TableCell({
    width: opts.width ? { size: parseFloat(opts.width), type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.bg ? { type: 'clear', fill: opts.bg } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [run(text, { bold: opts.bold, size: opts.size })],
      }),
    ],
  });
}

function cellMulti(texts: string[], opts: { bold?: boolean; align?: DocxAlign; width?: string; size?: number } = {}): TableCell {
  return new TableCell({
    width: opts.width ? { size: parseFloat(opts.width), type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: texts.map(
      (t) =>
        new Paragraph({
          alignment: opts.align ?? AlignmentType.LEFT,
          children: [run(t, { bold: opts.bold, size: opts.size })],
        }),
    ),
  });
}

const BORDER_SOFT = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
};

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

export async function buildDocx(q: Quotation, template: QuoteTemplate): Promise<Blob> {
  const totals = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
  const sym = q.details.currency === 'INR' ? '₹' : q.details.currency;
  const accent = template.accent.replace('#', '');
  const margin = template.pageMargin * MM_TO_TWIPS;

  const companyLine = `${q.company.titlePrefix ? `${q.company.titlePrefix} ` : ''}${q.company.name || ''}`;
  const contactLine = [q.company.contactPerson, q.company.phone].filter(Boolean).join(' | ');

  // ── Header (2-column: company left · quote no/date right) ──
  const headerChildren: (Paragraph | Table)[] = [];
  if (q.showLogo && q.company.logo) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new ImageRun({
            data: dataUrlToUint8(q.company.logo),
            transformation: { width: Math.round(template.logoSize * 0.8), height: Math.round(template.logoSize * 0.8 * 0.4) },
            type: imageType(q.company.logo),
          }),
        ],
        spacing: { after: 120 },
      }),
    );
  }

  const leftCells: Paragraph[] = [
    para(run(companyLine, { bold: true, size: 52 }), { after: 40 }),
  ];
  if (q.company.email) leftCells.push(para(run(`Email: ${q.company.email}`, { size: 20, color: '374151' }), { after: 20 }));
  if (q.company.businessDesc) leftCells.push(para(run(q.company.businessDesc, { bold: true, size: 20 }), { after: 20 }));
  if (q.company.address) leftCells.push(para(run(q.company.address, { size: 20, color: '374151' }), { after: 20 }));
  if (contactLine) leftCells.push(para(run(`Contact: ${contactLine}`, { size: 20, color: '374151' }), { after: 0 }));

  const rightCells: Paragraph[] = [];
  if (q.details.quoteNo) rightCells.push(para([run('Quotation No: ', { size: 20 }), run(q.details.quoteNo, { bold: true, size: 20 })], { align: AlignmentType.RIGHT, after: 20 }));
  if (q.details.quoteDate) rightCells.push(para([run('Date: ', { size: 20 }), run(`DT.${formatDate(q.details.quoteDate)}`, { bold: true, size: 20 })], { align: AlignmentType.RIGHT, after: 0 }));

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: leftCells }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: rightCells }),
        ],
      }),
    ],
  });
  headerChildren.push(headerTable);
  headerChildren.push(para(run(''), { before: 40, after: 0 }));

  const footerChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        run(companyLine || '', { size: 16, color: '6b7280' }),
        run('    |    Page ', { size: 16, color: '6b7280' }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6b7280', font: 'Calibri' }),
        run(' of ', { size: 16, color: '6b7280' }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '6b7280', font: 'Calibri' }),
      ],
    }),
  ];

  // ── Body ───────────────────────────────────────────────────
  const body: Paragraph[] = [];
  const customerContact = [
    q.customer.gstin ? `GSTIN: ${q.customer.gstin}` : '',
    q.customer.pan ? `PAN: ${q.customer.pan}` : '',
    q.customer.phone ? `Ph: ${q.customer.phone}` : '',
    q.customer.email ? `Email: ${q.customer.email}` : '',
  ].filter(Boolean).join('  |  ');
  const cityLine = [q.customer.city, q.customer.state].filter(Boolean).join(', ');

  body.push(para(run('To,', { bold: true }), { before: 200, after: 0 }));
  if (q.customer.attention) body.push(para(run(q.customer.attention, { bold: true }), { after: 0 }));
  if (q.customer.company || q.customer.name) body.push(para(run(q.customer.company || q.customer.name, { bold: true, size: 24 }), { after: 0 }));
  if (q.customer.address) body.push(...q.customer.address.split('\n').filter(Boolean).map((l) => para(run(l, { size: 22 }), { after: 0 })));
  if (cityLine || q.customer.pincode) body.push(para(run([cityLine, q.customer.pincode].filter(Boolean).join(', '), { size: 22 }), { after: 0 }));
  if (customerContact) body.push(para(run(customerContact, { size: 20, color: '374151' }), { before: 40, after: 0 }));

  if (q.details.subject) {
    body.push(para([run('SUB: ', { bold: true, size: 24 }), run(q.details.subject, { size: 24 })], { before: 200, after: 0 }));
  }
  if (q.details.poNumber || q.details.reference) {
    const refText = q.details.poNumber
      ? `YOUR P.ORDER NO. ${q.details.poNumber}${q.details.poDate ? `  DT.${formatDate(q.details.poDate)}` : ''}`
      : q.details.reference || '';
    body.push(para([run('REF: ', { bold: true, size: 24 }), run(refText, { size: 24 })], { before: 120, after: 0 }));
  }
  if (q.introduction) {
    body.push(...q.introduction.split('\n').filter(Boolean).map((l) => para(run(l, { size: 24 }), { before: 200, after: 60 })));
  }

  // ── Items table (6 columns) ────────────────────────────────
  const headers = ['SR NO', 'DESCRIPTION', 'HSN CODE', 'QTY', 'PRICE', 'AMOUNT'];
  const widths = ['7', '44', '14', '9', '13', '13'];
  const aligns: DocxAlign[] = [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.RIGHT, AlignmentType.RIGHT];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { bold: true, align: aligns[i], width: widths[i], bg: template.tableHeaderBg, size: 20 })),
  });

  const bodyRows = q.items.map((it, i) => {
    const descParts = [it.description];
    if (it.drawingNo || it.revision) descParts.push(`Drg No. ${it.drawingNo || '-'}, Rev No. ${it.revision || '-'}`);
    if (it.unit) descParts.push(`Unit: ${it.unit}`);
    return new TableRow({
      children: [
        cell(String(i + 1), { align: AlignmentType.CENTER, width: widths[0] }),
        cellMulti(descParts.filter(Boolean), { width: widths[1] }),
        cell(it.hsnCode, { align: AlignmentType.CENTER, width: widths[2] }),
        cell(String(it.quantity ?? ''), { align: AlignmentType.CENTER, width: widths[3] }),
        cell(it.rate ? formatNumber(it.rate) : '', { align: AlignmentType.RIGHT, width: widths[4] }),
        cell(it.amount ? it.amount.toFixed(2) : '', { align: AlignmentType.RIGHT, width: widths[5] }),
      ],
    });
  });

  if (bodyRows.length === 0) {
    bodyRows.push(new TableRow({ children: headers.map((h, i) => cell('', { width: widths[i] })) }));
  }

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_SOFT,
    rows: [headerRow, ...bodyRows],
  });

  // ── Totals (right aligned) ─────────────────────────────────
  const totalRows: TableRow[] = [
    new TableRow({ children: [cell('SUB TOTAL', { align: AlignmentType.RIGHT, width: '70', bold: true }), cell(`${sym} ${totals.subTotal.toFixed(2)}`, { align: AlignmentType.RIGHT, width: '30' })] }),
  ];
  if (totals.sgst > 0) totalRows.push(new TableRow({ children: [cell(`SGST ${q.gst.sgst}%`, { align: AlignmentType.RIGHT, width: '70' }), cell(`${sym} ${totals.sgst.toFixed(2)}`, { align: AlignmentType.RIGHT, width: '30' })] }));
  if (totals.cgst > 0) totalRows.push(new TableRow({ children: [cell(`CGST ${q.gst.cgst}%`, { align: AlignmentType.RIGHT, width: '70' }), cell(`${sym} ${totals.cgst.toFixed(2)}`, { align: AlignmentType.RIGHT, width: '30' })] }));
  if (totals.igst > 0) totalRows.push(new TableRow({ children: [cell(`IGST ${q.gst.igst}%`, { align: AlignmentType.RIGHT, width: '70' }), cell(`${sym} ${totals.igst.toFixed(2)}`, { align: AlignmentType.RIGHT, width: '30' })] }));
  if (totals.discount > 0) totalRows.push(new TableRow({ children: [cell(`DISCOUNT${q.discount.type === 'percent' ? ` ${q.discount.value}%` : ''}`, { align: AlignmentType.RIGHT, width: '70' }), cell(`- ${sym} ${totals.discount.toFixed(2)}`, { align: AlignmentType.RIGHT, width: '30' })] }));
  if (q.roundOff && totals.roundOff !== 0) totalRows.push(new TableRow({ children: [cell('ROUND OFF', { align: AlignmentType.RIGHT, width: '70' }), cell(`${sym} ${totals.roundOff.toFixed(2)}`, { align: AlignmentType.RIGHT, width: '30' })] }));
  totalRows.push(
    new TableRow({
      children: [
        cell('GRAND TOTAL', { align: AlignmentType.RIGHT, bold: true, bg: template.tableHeaderBg, width: '70', size: 22 }),
        cell(`${sym} ${totals.rounded.toFixed(2)}`, { align: AlignmentType.RIGHT, bold: true, bg: template.tableHeaderBg, width: '30', size: 22 }),
      ],
    }),
  );

  const totalsTable = new Table({
    width: { size: 55, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    borders: BORDER_SOFT,
    rows: totalRows,
  });

  const amountWords = para([run('Amount in Words: ', { bold: true, size: 22 }), run(totals.amountInWords, { size: 22 })], { before: 160, after: 120 });

  // ── Terms / notes / signature ──────────────────────────────
  const blocks: Paragraph[] = [];
  if (q.terms) {
    blocks.push(para(run('TERMS & CONDITIONS', { bold: true, size: 24, color: accent }), { before: 120, after: 80 }));
    blocks.push(...q.terms.split('\n').filter(Boolean).map((line) => para(run(line, { size: 22 }), { after: 40 })));
  }
  if (q.notes) {
    blocks.push(para(run('NOTE:-', { bold: true, size: 24, color: accent }), { before: 200, after: 80 }));
    blocks.push(
      ...q.notes
        .split('\n')
        .map((l) => l.replace(/^[-•*]\s*/, ''))
        .filter(Boolean)
        .map((line) => para(run(`• ${line}`, { size: 22 }), { after: 40 })),
    );
  }

  if (q.details.paymentTerms) blocks.push(para([run('Payment Terms: ', { bold: true, size: 22 }), run(q.details.paymentTerms, { size: 22 })], { before: 200, after: 40 }));
  if (q.details.deliveryTerms) blocks.push(para([run('Delivery: ', { bold: true, size: 22 }), run(q.details.deliveryTerms, { size: 22 })], { after: 40 }));
  if (q.details.freight) blocks.push(para([run('Freight: ', { bold: true, size: 22 }), run(q.details.freight, { size: 22 })], { after: 40 }));
  if (q.details.validity) blocks.push(para([run('Validity: ', { bold: true, size: 22 }), run(q.details.validity, { size: 22 })], { after: 40 }));

  // signature (bottom right)
  blocks.push(para(run('THANKING YOU', { bold: true, size: 26 }), { before: 300, after: 20, align: AlignmentType.RIGHT }));
  blocks.push(para(run(companyLine, { bold: true, size: 24 }), { after: 40, align: AlignmentType.RIGHT }));
  if (q.showSignature && q.company.signatory.image) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: dataUrlToUint8(q.company.signatory.image),
            transformation: { width: Math.round(template.signatureSize * 0.75), height: Math.round(template.signatureSize * 0.4) },
            type: imageType(q.company.signatory.image),
          }),
        ],
        spacing: { before: 100 },
      }),
    );
  }
  blocks.push(para(run(q.company.signatory.name || '', { size: 22 }), { before: 100, after: 20, align: AlignmentType.RIGHT }));
  blocks.push(para(run(q.company.signatory.role || '', { size: 20, color: '374151' }), { after: 20, align: AlignmentType.RIGHT }));
  if (q.showStamp && q.company.stamp) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: dataUrlToUint8(q.company.stamp),
            transformation: { width: Math.round(template.stampSize * 0.7), height: Math.round(template.stampSize * 0.7 * 0.5) },
            type: imageType(q.company.stamp),
          }),
        ],
      }),
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: { top: Math.round(margin), bottom: Math.round(margin), left: Math.round(margin), right: Math.round(margin) },
          },
        },
        headers: { default: new Header({ children: headerChildren }) },
        footers: { default: new Footer({ children: footerChildren }) },
        children: [
          ...body,
          itemsTable,
          totalsTable,
          amountWords,
          ...blocks,
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
