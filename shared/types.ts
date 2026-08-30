// ─────────────────────────────────────────────────────────────
// Shared domain model — used by both the frontend and backend.
// ─────────────────────────────────────────────────────────────

export type ID = string;

export function isNonEmpty(s: string | null | undefined): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

export function nullIfBlank(s: string | null | undefined): string | null {
  if (!s || s.trim() === '') return null;
  return s.trim();
}

// ── Company (seller) profile ─────────────────────────────────
export interface BankDetails {
  name: string;
  branch: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upi: string;
  qr: string | null; // data-URL
}

export interface CompanyDetails {
  name: string;
  titlePrefix: string; // e.g. "M/S."
  businessDesc: string; // e.g. "GOVT. ELECTRICAL CONTRACTOR"
  contactPerson: string; // e.g. "SACHIN"
  address: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  website: string;
  state?: string; // e.g. "Maharashtra" (used as default Place of Supply on invoices)
  stateCode?: string; // e.g. "27" (GST state code)
  logo: string | null; // data-URL
  stamp: string | null; // data-URL
  bank: BankDetails;
  signatory: { name: string; role: string; image: string | null }; // image = signature
}

// ── Customer (buyer) ─────────────────────────────────────────
export interface CustomerDetails {
  id: string;
  name: string;
  company: string;
  attention: string; // e.g. "PURCHASE MANAGER"
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  createdAt: string;
}

export function emptyCustomer(id: string): CustomerDetails {
  return {
    id,
    name: '',
    company: '',
    attention: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    createdAt: new Date().toISOString(),
  };
}

// ── Items ────────────────────────────────────────────────────
export interface QuoteItem {
  id: string;
  srNo: number;
  description: string;
  hsnCode: string;
  drawingNo: string;
  revision: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

// ── GST / totals ─────────────────────────────────────────────
export type GstType = 'cgst_sgst' | 'igst' | 'none';

export interface GstConfig {
  type: GstType;
  cgst: number; // percent
  sgst: number; // percent
  igst: number; // percent
}

export interface DiscountConfig {
  type: 'percent' | 'amount';
  value: number;
}

export interface Totals {
  subTotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
  rounded: number;
  roundOff: number; // rounded - grandTotal
  amountInWords: string;
}

// ── Quotation ────────────────────────────────────────────────
export type DocType = 'quotation' | 'invoice';

export type InvoiceCopyType =
  | 'ORIGINAL FOR RECIPIENT'
  | 'DUPLICATE FOR TRANSPORTER'
  | 'DUPLICATE FOR SUPPLIER'
  | 'TRIPLICATE FOR SUPPLIER';

export const INVOICE_COPY_TYPES: InvoiceCopyType[] = [
  'ORIGINAL FOR RECIPIENT',
  'DUPLICATE FOR TRANSPORTER',
  'DUPLICATE FOR SUPPLIER',
  'TRIPLICATE FOR SUPPLIER',
];

export interface InvoiceOptions {
  invoiceNo: string;
  invoiceDate: string; // yyyy-mm-dd
  copyType: InvoiceCopyType;
  placeOfSupply: string; // e.g. "Maharashtra"
  stateCode: string; // e.g. "27"
  irn: string; // e-invoice IRN (optional)
}

export function emptyInvoiceOptions(): InvoiceOptions {
  return {
    invoiceNo: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    copyType: 'ORIGINAL FOR RECIPIENT',
    placeOfSupply: '',
    stateCode: '',
    irn: '',
  };
}

export const isInvoice = (q: Quotation): boolean => q.docType === 'invoice';

export interface QuotationDetails {
  quoteNo: string;
  quoteDate: string; // yyyy-mm-dd
  reference: string; // mapped from PO number
  poNumber: string;
  poDate: string; // yyyy-mm-dd
  subject: string;
  paymentTerms: string;
  deliveryTerms: string;
  freight: string;
  validity: string;
  currency: string; // ISO code, e.g. INR
}

export interface QuoteTheme {
  accent: string; // hex accent color
  font: 'sans' | 'serif';
}

export interface Quotation {
  id: string;
  title: string;
  status: 'draft' | 'final';
  version: number;
  createdAt: string;
  updatedAt: string;
  templateId: string;
  company: CompanyDetails;
  customer: CustomerDetails;
  details: QuotationDetails;
  items: QuoteItem[];
  gst: GstConfig;
  discount: DiscountConfig;
  roundOff: boolean;
  notes: string;
  terms: string;
  introduction: string; // opening paragraph ("Dear Sir, ...")
  footer: string;
  watermark: string;
  theme: QuoteTheme;
  showLogo: boolean;
  showStamp: boolean;
  showSignature: boolean;
  showQr: boolean;
  sourcePo: string | null; // original file name
  history: QuotationSnapshot[];
  // Billing (Tax Invoice) fields — present when docType === 'invoice'
  docType?: DocType; // defaults to 'quotation'
  invoice?: InvoiceOptions | null;
}

export interface QuotationSnapshot {
  version: number;
  at: string;
  label: string;
  data: Quotation; // frozen copy
}

// ── Templates ────────────────────────────────────────────────
export interface QuoteTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  isSystem?: boolean;
  accent: string;
  font: 'sans' | 'serif';
  headerAlign: 'left' | 'center';
  showHeaderBorder: boolean;
  showFooterLine: boolean;
  logoSize: number; // px in preview
  signatureSize: number;
  stampSize: number;
  watermarkOpacity: number; // 0..1
  pageMargin: number; // px (preview scale)
  bodyFontSize: number;
  tableHeaderBg: string;
  tableStyle?: 'bordered' | 'zebra' | 'minimal';
}

// ── Settings ─────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  currency: { code: string; symbol: string };
  gst: { cgst: number; sgst: number; igst: number };
  defaultTerms: string;
  defaultNotes: string;
  theme: ThemeMode;
  dateFormat: string; // DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
  language: string; // 'en' | 'hi'
  autoSave: boolean;
  watermarkText: string;
  quotePrefix: string;
  quoteYear: string;
  quoteSeq: number;
  invoicePrefix: string;
  invoiceSeq: number;
  analyticsEnabled: boolean;
}

// ── Purchase Order (parsed) ──────────────────────────────────
export interface PoLine {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export interface PoItem {
  description: string;
  hsnCode?: string;
  drawingNo?: string;
  revision?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

export interface PoData {
  customerName?: string;
  companyName?: string;
  attention?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  poNumber?: string;
  poDate?: string;
  reference?: string;
  supplier?: string;
  currency?: string;
  items: PoItem[];
  subTotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  gstPercent?: number;
  grandTotal?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  freight?: string;
  validity?: string;
  remarks?: string;
  notes?: string;
}

// ── Analytics / audit ────────────────────────────────────────
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'DUPLICATE'
  | 'EXPORT_PDF'
  | 'EXPORT_DOCX'
  | 'EXPORT_EXCEL'
  | 'EXPORT_CSV'
  | 'IMPORT'
  | 'PARSE_PO'
  | 'PRINT'
  | 'SHARE';

export interface AuditEntry {
  id: string;
  at: string;
  action: AuditAction;
  detail: string;
}

export interface AnalyticsEntry {
  id: string;
  date: string; // yyyy-mm-dd
  quotesCreated: number;
  quotesExported: number;
}

// ── API contracts ────────────────────────────────────────────
export interface ParsePdfResponse {
  ok: boolean;
  method: 'text' | 'ocr' | 'server';
  pages: PoLine[][];
  text: string;
  error?: string;
}

export const DEFAULT_GST: GstConfig = { type: 'cgst_sgst', cgst: 9, sgst: 9, igst: 18 };

export const DEFAULT_SETTINGS: AppSettings = {
  currency: { code: 'INR', symbol: '₹' },
  gst: { cgst: 9, sgst: 9, igst: 18 },
  defaultTerms:
    '1) Prices are exclusive of GST.\n2) Goods once supplied will not be taken back.\n3) Warranty as per standard electrical industry norms.\n4) Any dispute subject to local jurisdiction only.',
  defaultNotes:
    'WORK START AFTER YOUR CONFIRMATION OR PO RELEASE.\nPAYMENT TERMS WITHIN 15 DAYS ONLY.\nGST EXTRA AS APPLICABLE.',
  theme: 'light',
  dateFormat: 'DD/MM/YYYY',
  language: 'en',
  autoSave: true,
  watermarkText: 'JEEVAN PRAKASH ELECTRICALS',
  quotePrefix: 'JPE',
  quoteYear: String(new Date().getFullYear()),
  quoteSeq: 0,
  invoicePrefix: 'INV',
  invoiceSeq: 0,
  analyticsEnabled: true,
};

export const PRESET_ACCENTS = ['#0ea5e9', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0f172a', '#64748b'];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];
