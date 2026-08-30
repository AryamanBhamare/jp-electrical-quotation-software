// Maps a parsed Purchase Order onto a fresh Quotation draft.
import type { AppSettings, CompanyDetails, CustomerDetails, PoData, QuoteItem, Quotation } from '@shared/types';
import { DEFAULT_GST, emptyCustomer, emptyInvoiceOptions, nullIfBlank } from '@shared/types';
import { uid } from '@/lib/id';
import { todayISO, toISOFromAny } from '@/lib/format';
import { round2 } from '@/lib/calculations';

export function nextQuoteNumber(prefix: string, year: string, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export function nextInvoiceNumber(prefix: string, year: string, seq: number): string {
  return `${prefix || 'INV'}-${year}-${String(seq).padStart(4, '0')}`;
}

export function buildQuotationFromPo(
  po: PoData,
  company: CompanyDetails,
  settings: AppSettings,
  quoteNo: string,
): Quotation {
  const now = new Date().toISOString();
  const customer: CustomerDetails = {
    ...emptyCustomer(uid('cust')),
    name: nullIfBlank(po.customerName ?? '') ?? '',
    company: nullIfBlank(po.companyName ?? '') ?? '',
    attention: nullIfBlank(po.attention ?? '') ?? '',
    gstin: nullIfBlank(po.gstin ?? '') ?? '',
    pan: nullIfBlank(po.pan ?? '') ?? '',
    address: nullIfBlank(po.address ?? '') ?? '',
    city: nullIfBlank(po.city ?? '') ?? '',
    state: nullIfBlank(po.state ?? '') ?? '',
    pincode: nullIfBlank(po.pincode ?? '') ?? '',
    phone: nullIfBlank(po.phone ?? '') ?? '',
    email: nullIfBlank(po.email ?? '') ?? '',
  };

  const items: QuoteItem[] = po.items
    .filter((it) => it.description || it.quantity || it.rate)
    .map((it: PoItemLike, i) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.rate) || 0;
      return {
        id: uid('it'),
        srNo: i + 1,
        description: it.description ?? '',
        hsnCode: it.hsnCode ?? '',
        drawingNo: it.drawingNo ?? '',
        revision: it.revision ?? '',
        unit: it.unit ?? 'Nos',
        quantity: qty,
        rate,
        amount: round2(qty * rate),
      };
    });

  // GST type heuristics from parsed amounts/percent
  const gst = { ...DEFAULT_GST, ...settings.gst };
  if (po.gstPercent) {
    gst.igst = po.gstPercent;
    gst.type = po.sgst != null || po.cgst != null ? 'cgst_sgst' : 'igst';
    if (gst.type === 'cgst_sgst') {
      gst.cgst = round2(po.gstPercent / 2);
      gst.sgst = round2(po.gstPercent / 2);
      gst.igst = 0;
    }
  }

  const currencyCode =
    po.currency === '₹' || /^(rupee|inr|india)$/i.test(po.currency ?? '')
      ? 'INR'
      : po.currency && /^[A-Z]{3}$/.test(po.currency)
        ? po.currency
        : settings.currency.code;

  return {
    id: uid('q'),
    title: `Quotation ${quoteNo}`,
    status: 'draft',
    version: 1,
    createdAt: now,
    updatedAt: now,
    templateId: 'default',
    company: JSON.parse(JSON.stringify(company)) as CompanyDetails,
    customer,
    details: {
      quoteNo,
      quoteDate: todayISO(),
      reference: nullIfBlank(po.poNumber ?? '') ?? '',
      poNumber: nullIfBlank(po.poNumber ?? '') ?? '',
      poDate: toISOFromAny(po.poDate ?? '') || '',
      subject: nullIfBlank(po.remarks ?? '') ?? `Quotation against PO ${po.poNumber ?? ''}`.trim(),
      paymentTerms: nullIfBlank(po.paymentTerms ?? '') ?? settings.defaultTerms,
      deliveryTerms: nullIfBlank(po.deliveryTerms ?? '') ?? '',
      freight: nullIfBlank(po.freight ?? '') ?? '',
      validity: nullIfBlank(po.validity ?? '') ?? '30 days from date of quotation',
      currency: currencyCode,
    },
    items,
    gst,
    discount: { type: 'percent', value: 0 },
    roundOff: true,
    notes: nullIfBlank(po.notes ?? '') ?? settings.defaultNotes,
    terms: nullIfBlank(po.paymentTerms ?? '') ?? settings.defaultTerms,
    introduction:
      'Dear Sir,\n\nWith reference to the above subject, we are pleased to submit our quotation as follows.',
    footer: '',
    watermark: settings.watermarkText,
    theme: { accent: '#0ea5e9', font: 'sans' },
    showLogo: true,
    showStamp: true,
    showSignature: true,
    showQr: true,
    sourcePo: null,
    history: [],
    docType: 'quotation',
    invoice: null,
  };
}

export function buildBlankQuotation(quoteNo: string, company: CompanyDetails, settings: AppSettings): Quotation {
  const now = new Date().toISOString();
  return {
    id: uid('q'),
    title: `Quotation ${quoteNo}`,
    status: 'draft',
    version: 1,
    createdAt: now,
    updatedAt: now,
    templateId: 'default',
    company: JSON.parse(JSON.stringify(company)) as CompanyDetails,
    customer: emptyCustomer(uid('cust')),
    details: {
      quoteNo,
      quoteDate: todayISO(),
      reference: '',
      poNumber: '',
      poDate: '',
      subject: '',
      paymentTerms: settings.defaultTerms,
      deliveryTerms: '',
      freight: '',
      validity: '30 days from date of quotation',
      currency: settings.currency.code,
    },
    items: [emptyItem(1)],
    gst: { ...DEFAULT_GST, ...settings.gst },
    discount: { type: 'percent', value: 0 },
    roundOff: true,
    notes: settings.defaultNotes,
    terms: settings.defaultTerms,
    introduction:
      'Dear Sir,\n\nWith reference to the above subject, we are pleased to submit our quotation as follows.',
    footer: '',
    watermark: settings.watermarkText,
    theme: { accent: '#0ea5e9', font: 'sans' },
    showLogo: true,
    showStamp: true,
    showSignature: true,
    showQr: true,
    sourcePo: null,
    history: [],
    docType: 'quotation',
    invoice: null,
  };
}

export function buildBlankInvoice(company: CompanyDetails, settings: AppSettings): Quotation {
  const now = new Date().toISOString();
  const seq = settings.invoiceSeq + 1;
  const invoiceNo = nextInvoiceNumber(settings.invoicePrefix, settings.quoteYear, seq);
  const invoice = emptyInvoiceOptions();
  invoice.invoiceNo = invoiceNo;
  invoice.placeOfSupply = company.state ?? '';
  invoice.stateCode = company.stateCode ?? '';
  const q: Quotation = buildBlankQuotation(invoiceNo, company, settings);
  q.title = `Tax Invoice ${invoiceNo}`;
  q.details.quoteNo = invoiceNo;
  q.docType = 'invoice';
  q.invoice = invoice;
  return q;
}

/**
 * Duplicates an existing quotation as a new Tax Invoice (same company, customer,
 * items, tax and terms) with a fresh invoice number — "Convert quotation to bill".
 */
export function buildInvoiceFromQuotation(source: Quotation, company: CompanyDetails, settings: AppSettings): Quotation {
  const now = new Date().toISOString();
  const seq = settings.invoiceSeq + 1;
  const invoiceNo = nextInvoiceNumber(settings.invoicePrefix, settings.quoteYear, seq);
  const q = JSON.parse(JSON.stringify(source)) as Quotation;
  q.id = uid('q');
  q.title = `Tax Invoice ${invoiceNo}`;
  q.status = 'draft';
  q.version = 1;
  q.createdAt = now;
  q.updatedAt = now;
  q.templateId = 'default';
  q.company = JSON.parse(JSON.stringify(company)) as CompanyDetails;
  q.details = { ...q.details, quoteNo: invoiceNo, quoteDate: todayISO() };
  q.docType = 'invoice';
  q.invoice = {
    ...emptyInvoiceOptions(),
    invoiceNo,
    placeOfSupply: company.state ?? '',
    stateCode: company.stateCode ?? '',
  };
  q.history = [];
  return q;
}

export function emptyItem(srNo: number): QuoteItem {
  return { id: uid('it'), srNo, description: '', hsnCode: '', drawingNo: '', revision: '', unit: 'Nos', quantity: 0, rate: 0, amount: 0 };
}

/**
 * Returns a copy of the quotation whose EMPTY company fields are filled from the
 * live (Settings) company profile. Explicit per-quote values win over the profile;
 * only blanks ('' / null) are backfilled — so GSTIN/PAN/logo/signature entered in
 * Settings appear on quotations created before they were added.
 */
export function withLiveCompany(q: Quotation, live: CompanyDetails): Quotation {
  const c = JSON.parse(JSON.stringify(q.company)) as CompanyDetails;
  const p = JSON.parse(JSON.stringify(live)) as CompanyDetails;
  const blank = (v: unknown) => v === null || v === undefined || v === '';
  const out: Record<string, unknown> = { ...c };
  for (const key of Object.keys(p) as (keyof CompanyDetails)[]) {
    const cv = c[key];
    const pv = p[key];
    if (typeof pv === 'object' && pv !== null) {
      const cur = (typeof cv === 'object' && cv !== null ? cv : {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...cur };
      for (const k of Object.keys(pv)) {
        if (blank(cur[k]) && !blank((pv as Record<string, unknown>)[k])) {
          merged[k] = (pv as Record<string, unknown>)[k];
        }
      }
      out[key] = merged;
    } else if (blank(cv) && !blank(pv)) {
      out[key] = pv as string;
    }
  }
  return { ...q, company: out as unknown as CompanyDetails };
}

interface PoItemLike {
  description?: string;
  hsnCode?: string;
  drawingNo?: string;
  revision?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}
