// Generic Purchase-Order extractor.
//
// Works across arbitrary layouts from ANY company: no fixed coordinates, line
// numbers, fonts or PDF structure are assumed. Everything is keyword / regex /
// pattern driven with:
//   - synonym mapping (PO No / P.O. NO / Order No / PURCHASE ORDER, etc.)
//   - preference scoring (pick the most plausible candidate for a field)
//   - multiple fallbacks (labels, structure, positions) per field
//   - hard tolerance: a field that can't be found is left undefined so the
//     user can simply fill it in the editor. A bad layout can never crash it.
import type { PoData, PoItem, PoLine } from '@shared/types';
import { INDIAN_STATES, isNonEmpty } from '@shared/types';
import { toISOFromAny, detectCurrencySymbol } from '@/lib/format';

// ── regex toolkit ───────────────────────────────────────────
const RE = {
  email: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/,
  gstin: /GST\s*I?N?\s*[:\-]?\s*([0-9A-Z]{15})/i,
  pan: /\b([A-Z]{5}[0-9]{4}[A-Z])\b/,
  phone: /(\+?\d[\d\s\-()]{8,}\d)/g,
  poNumber: /(?:\bP\.?\s*O\.?(?:\s*(?:NO|NUM|NUMBER))?|\bP\.?\s*ORDER(?:\s*(?:NO|NUM|NUMBER))?|\bPURCHASE\s*ORDER(?:\s*(?:NO|NUM|NUMBER))?|\bORDER\s*(?:NO|NUM|NUMBER)|\bPO\s*(?:NO|NUMBER)\.?)\s*[:#\-.]?\s*\b([A-Z0-9][A-Z0-9\/\-_.]{2,})/gi,
  poDate: /(?:\bP\.?\s*ORDER\s*(?:DATE|DT)|\bP\.?\s*O\.?\s*(?:DATE|DT)|\bPO\s*(?:DATE|DT)|\bPURCHASE\s*ORDER\s*(?:DATE|DT)|\bORDER\s*(?:DATE|DT))\s*[:#\-.]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i,
  hsnLabel: /(?:hsn|sac)\s*(?:\/|\/\/)?\s*(?:code)?\s*[:#\-.]?\s*(\d{4,8})/i,
  drawing: /(?:dwg|drw|drg|drawing)\s*(?:no\.?|num(?:ber)?|#)?\s*[:#\-.]?\s*(?![-–])([A-Za-z0-9][A-Za-z0-9/._\-]{0,15})/i,
  revision: /(?:rev|revision)\s*(?:no\.?|#)?\s*[:#\-.]?\s*(?![-–])([A-Za-z0-9][A-Za-z0-9/._\-]{0,6})/i,
  gstPercent: /(?:gst|tax)\s*(?:rate)?\s*[:#\-.]?\s*(\d+(?:\.\d+)?)\s*%/i,
  pincode: /\b([1-9][0-9]{5})\b/,
  numeric: /^[₹$€£]?\s?\-?[\d,]+(?:\.\d{1,6})?$/,
  grandTotal: /(?:grand\s*total|net\s*total|total\s*amount|amount\s*payable|total\s*payable|bill\s*total|invoice\s*total)(?:\s*(?:inr|rs\.?|rupees))?\s*[:₹$€£\-.]?\s*([\d,]+(?:\.\d{1,3})?)/i,
  grandTotalLoose: /\btotal\b(?:\s*(?:inr|rs\.?|rupees))?\s*[:₹$€£\-.]?\s*([\d,]+(?:\.\d{1,3})?)/i,
  subTotal: /(?:sub\s*total|subtotal|total\s*before\s*(?:tax|gst)|taxable\s*amount|taxable\s*value|total\s*taxable|base\s*amount|basic\s*amount|total\s*value|net\s*amount)\s*(?:inr|rs\.?|rupees)?\s*[:₹$€£\-.]?\s*([\d,]+(?:\.\d{1,3})?)/i,
  gstAmount: (which: 'CGST' | 'SGST' | 'IGST'): RegExp =>
    new RegExp(
      `(?:${which === 'CGST' ? 'CGST|C\\.?\\s*GST' : which === 'SGST' ? 'SGST|S\\.?\\s*GST' : 'IGST|I\\.?\\s*GST'})\\s*(?:\\(?\\d+(?:\\.\\d+)?%\\)?)?\\s*(?:amount|amt)?\\s*(?:inr|rs\\.?)?\\s*[:₹$€£\\-.]?\\s*([\\d,]+(?:\\.\\d{1,3})?)`,
      'i',
    ),
};

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m && m[1] ? m[1].trim() : null;
}

// Dev-only diagnostics: works in the Vite browser bundle and under tsx/Node.
function devLog(...args: unknown[]): void {
  try {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (env?.DEV) console.warn('[extractor]', ...args);
  } catch {
    try {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') console.warn('[extractor]', ...args);
    } catch {
      /* never let diagnostics throw */
    }
  }
}

// Wrap any extraction so a single bad regex/layout can never crash the parser.
function safe<T>(label: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    devLog(`"${label}" failed — skipping`, err);
    return fallback;
  }
}

function num(text: string): number | null {
  const cleaned = text.replace(/[₹$€£,\s]/g, '');
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const v = parseFloat(cleaned);
  return isFinite(v) ? v : null;
}

function isNumericToken(t: string): boolean {
  return RE.numeric.test(t.trim());
}

// HSN / SAC codes are pure integers (4-8 digits) with no decimal or thousand
// separator. Prices/amounts nearly always carry ".00" or a comma — guarded below,
// so a trailing HSN/SAC code is never mistaken for the amount.
function isCodeLike(text: string): boolean {
  const cleaned = text.replace(/[₹$€£\s]/g, '');
  if (/[.,]/.test(cleaned)) return false;
  return /^\d{4,8}$/.test(cleaned);
}

// ── small text helpers ──────────────────────────────────────
const ID_STOPWORDS = new Set([
  'PURCHASE', 'ORDER', 'NO', 'NUM', 'NUMBER', 'PO', 'P.O', 'SERVICE', 'CODE', 'REF', 'REFERENCE',
  'DATE', 'DT', 'TOTAL', 'SAC', 'HSN', 'INR', 'GST', 'GSTIN', 'PAN', 'CIN', 'TAN', 'SL', 'SR',
  'SRNO', 'SNO', 'VALID', 'UPTO', 'FROM', 'TO', 'SHEET', 'PAGE', 'NEW', 'NA', 'NIL', 'SEE', 'ABC',
]);

// Pick the most plausible ID among all label matches: prefer one containing a
// digit, then a non-stopword, then the first candidate. Never returns garbage
// like "PURCHASE" captured from the document title.
function pickGoodId(text: string, re: RegExp): string | null {
  const g = re.global ? re : new RegExp(re.source, (re.flags || '') + 'g');
  const cands = [...text.matchAll(g)].map((m) => m[1]).filter(Boolean).map((s) => s.trim());
  if (!cands.length) return null;
  const withDigit = cands.find((c) => /\d/.test(c));
  if (withDigit) return withDigit;
  const word = cands.find((c) => !ID_STOPWORDS.has(c.toUpperCase().replace(/[.\s]/g, '')));
  return word ?? cands[0];
}

function firstGoodReference(text: string): string | null {
  const re = /\b(?:ref(?:erence)?\.?\s*(?:no\.?|num|number)?|our\s*ref(?:erence)?|your\s*ref(?:erence)?)\s*[:#\-.]?\s*([A-Z0-9][A-Z0-9\/\-_.]{1,})/gi;
  const cands = [...text.matchAll(re)].map((m) => m[1]);
  for (const c of cands) {
    if (c.startsWith('-') || c.startsWith('.')) continue;
    if (/^(dt|date|time|no|nil|na|n\/a)$/i.test(c)) continue;
    if (/^dt[\s./-]/i.test(c)) continue;
    return c;
  }
  return null;
}

function cleanDescription(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/^[\s:;,.|\-–—]+/, '').replace(/[\s:;,.|\-–—]+$/, '').trim();
}

const NEXT_LABEL = /\b(?:del(?:ivery)?\.?|p\.?\s*o\.?(?:\s*rder)?|purchase\s*order|order\s*(?:no\.?|num(?:ber)?|dt\.?|date)|valid(?:ity)?|upto|freight|warranty|mobile|transp(?:ort)?\.?|phone|tel|fax|email|e-?mail|gstin|gst|pan|notes?|remarks?|despatch|dispatch|schedule|packing|insurance|state|city|place|payment\s*terms?|sub\s*total|grand\s*total)\b/i;

// Truncate a captured section value at the next known section label
// (e.g. "45 Days Del. Sch. :IMMEDIATE" → "45 Days").
function cutAtNextLabel(s: string): string {
  const m = s.match(NEXT_LABEL);
  if (m && m.index != null && m.index > 0) s = s.slice(0, m.index);
  return s.replace(/[\s:;#\-.,|]+$/, '').trim();
}

// ── line classifiers ────────────────────────────────────────
function isSectionHeader(text: string): boolean {
  return /^\s*(terms?\s*(and\s*conditions?|of\s*sale)?|conditions?|payment\s*terms?|delivery\s*terms?|validity|freight|remarks?|notes?|warranty|shipping\s*terms?|tax\s*details|bank\s*details|contact|thanks|thank\s*you|regards|signature|certificate|declaration|for\s+[a-z]+)\b/i.test(text);
}

function isTitleLine(text: string): boolean {
  return /^(purchase\s*order|service\s*po|p\.?\s*o\.?\s*(form|order)?|tax\s*invoice|proforma\s*invoice|invoice|quotation|quote|estimate|order\s*form|bill\s*of\s*material|payment\s*voucher|debit\s*note|credit\s*note|delivery\s*note|goods\s*receipt)/i.test(text.trim()) || /purchase\s*order/i.test(text);
}

function isDateLine(text: string): boolean {
  return /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(text.trim());
}

// Lines that carry metadata (labels/values) rather than table content.
const META_LABEL = /^\s*(kind\s+attn|attn\.?|attention|to\b|from\b|bill\s*to|billed\s*to|sold\s*to|ship(?:ped)?\s*to|customer|buyer|consignee|purchaser|party|supplier|vendor|seller|details\s+of\s+supplier|details\s+of\s+buyer|p\.?o\.?(?:\s|\.)*(?:no|number|dt|date)|order\s*(?:no|number|dt|date)|po\s*(?:no|dt)|del(?:ivery)?\.?\s*terms?|delivery\s*|payment\s*terms?|valid(?:ity)?\s*|freight\s*|ref(?:erence)?\.?\s*(?:no\.?)?\s*[:#\-.]|our\s*ref|your\s*ref|despatch|dispatch|packing\s*[:#\-.]|warranty\s*[:#\-.]|insurance\s*[:#\-.]|inspection\s*[:#\-.]|place\s+of\s+(?:delivery|supply)|subject\s*[:#\-.]|phone\s*[:#\-.]|tel\s*[:#\-.]|mobile\s*[:#\-.]|email\s*[:#\-.]|fax\s*[:#\-.]|gst\s*[:#\-.]|gstin\s*[:#\-.]|pan\s*[:#\-.]|tan\s*[:#\-.]|cin\s*[:#\-.]|bank\s*[:#\-.]|account\s*[:#\-.]|ifsc\s*[:#\-.]|a\/c\s*[:#\-.]|state\s*[:#\-.]|city\s*[:#\-.]|gstin|gst\s*no|pan\s*no\.?|tan\b|cin\b)\b/i;

function isMetaLine(text: string): boolean {
  return META_LABEL.test(text.trim());
}

// Totals / tax summary lines end the item table.
function isTotalsLine(text: string): boolean {
  if (!/\d/.test(text)) return false;
  const t = text.trim();
  if (/^(cgst|sgst|igst|cess)\b/i.test(t)) return true;
  // Labels may be buried mid-line (e.g. "Terms & Conditions 1.000 Taxable Amount 15,000.00").
  const m = t.toLowerCase().match(/(?:^|[^\w&])(taxable\s*(?:amount|value)|sub\s*total|subtotal|grand\s*total|net\s*(?:amount|total)|total\s*(?:amount|taxable|value|before|inr|payable)?|amount\s*payable|round\s*(?:off|ing)|discount|adjustment|balance|paid|due|less)/);
  if (!m) return false;
  const labelEnd = (m.index ?? 0) + m[0].length;
  const rest = t.slice(labelEnd);
  const value = /^\s*(?:inr|rs\.?|rupees)?\s*[:₹$€£\-\s]*\d/.test(rest);
  const isPercent = /^\s*(?:inr|rs\.?|rupees)?\s*[:₹$€£\-\s]*\d+(?:\.\d+)?%/.test(rest);
  return value && !isPercent;
}

function looksLikeHeader(text: string): boolean {
  return /(\bqty|quantity)\b/i.test(text) && /\brate\b/i.test(text) && /\b(amount|total|value)\b/i.test(text);
}

// A second line of column titles right under the header (e.g. "Code | INR | % of Order | % Rate")
// that must not be mistaken for an item row.
function isSubHeader(text: string): boolean {
  const t = text.trim();
  if (!/%/.test(t) && !/\b(?:code|rate|disc|value|amount|unit|currency|inr|of|type|basis|order|per)\b/i.test(t)) return false;
  const numerics = t.split(/\s+/).filter(Boolean).filter(isNumericToken);
  return numerics.length <= 1;
}

// ── drawing / revision (Drg No., Rev No.) ───────────────────
function cleanDrawRevId(v: string, kind: 'drawing' | 'revision'): string | undefined {
  const s = v.trim();
  if (!s || /^[-–—.]+$/.test(s)) return undefined;
  if (/^(no|nos|dt|date|rev|revision|drg|dwg|drw|drawing|na|n\/a|none|nil|same)$/i.test(s)) return undefined;
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(s)) return undefined; // a date
  if (/^\d{1,2}:\d{2}/.test(s)) return undefined; // a time
  if (kind === 'drawing' && !/\d/.test(s)) return undefined; // avoid grabbing ordinary words
  if (kind === 'revision' && s.length > 4) return undefined;
  return s;
}

function extractDrawRev(text: string): { drawingNo?: string; revision?: string } {
  const out: { drawingNo?: string; revision?: string } = {};
  const d = text.match(RE.drawing);
  if (d && d[1]) {
    const v = cleanDrawRevId(d[1], 'drawing');
    if (v) out.drawingNo = v;
  }
  const r = text.match(RE.revision);
  if (r && r[1]) {
    const v = cleanDrawRevId(r[1], 'revision');
    if (v) out.revision = v;
  }
  return out;
}

function isDrawRevMetaLine(text: string): boolean {
  return /^(?:drg|dwg|drw|drawing|rev|revision)\b/i.test(text.trim());
}

// ── company detection ───────────────────────────────────────
const COMPANY_SUFFIX = /([A-Z][A-Z0-9&'.\- ]{1,60}?(?:PVT\.?\s*LTD\.?|PRIVATE\s+LIMITED|LLP|LTD\.?|LIMITED|ENTERPRISES|INDUSTRIES|WORKS|AGENCIES|CORPORATION|COMPANY|GROUP|SONS|TRADERS|TRADING|BROTHERS|SYNDICATE|FOUNDRY|MILLS|MOTORS|ELECTRICALS|ELECTRONICS|ENGINEERING|TECHNOLOGIES|SOLUTIONS|AUTO|AUTOMOTIVE|PHARMA|CHEMICALS|FABRICATION|MANUFACTURERS|MANUFACTURING))/i;

function pickCompany(text: string): string | null {
  const m = text.match(COMPANY_SUFFIX);
  if (!m) return null;
  let c = m[1].trim().replace(/\s{2,}/g, ' ');
  c = c.replace(/^[:\-.#\s]+/, '').replace(/[\s,;:]+$/, '').trim();
  if (c.length < 3 || c.length > 80) return null;
  if (/^(gstin|pan|cin|tan|tel|fax|email|phone|address|ref|supplier|vendor|buyer|customer)/i.test(c)) return null;
  return c;
}

// ── scalar fields ───────────────────────────────────────────
function extractScalars(lines: PoLine[]): Partial<PoData> {
  const out: Partial<PoData> = {};
  const fullText = lines.map((l) => l.text).join('\n');

  // Per-field guard: if a regex throws, log it (dev) and keep going.
  const get = <T>(label: string, fn: () => T | null | undefined): T | undefined => {
    try {
      const v = fn();
      return v == null ? undefined : v;
    } catch (err) {
      devLog(`field "${label}" failed — skipping`, err);
      return undefined;
    }
  };

  const email = get('email', () => firstMatch(fullText, RE.email));
  if (email) out.email = email;

  const gstin = get('gstin', () => firstMatch(fullText, RE.gstin));
  if (gstin) out.gstin = gstin.toUpperCase();

  const pan = get('pan', () => firstMatch(fullText, RE.pan));
  if (pan && pan !== gstin) out.pan = pan;

  const phones = get('phone', () => [...fullText.matchAll(RE.phone)].map((m) => m[1].replace(/\s+/g, ' ').trim())) ?? [];
  const cleanPhones = [...new Set(phones)].filter(
    (p) => !/[.$,;:]/.test(p) && (/^\d{10,15}$/.test(p.replace(/\D/g, '')) || /^\+/.test(p)),
  );
  if (cleanPhones.length) out.phone = cleanPhones[0];

  const poNum = get('poNumber', () => pickGoodId(fullText, RE.poNumber));
  if (poNum) out.poNumber = poNum.toUpperCase();

  const reference = get('reference', () => firstGoodReference(fullText));
  if (reference) out.reference = reference.toUpperCase();

  const poDateRaw = get('poDate', () => firstMatch(fullText, RE.poDate));
  const poDate = toISOFromAny(poDateRaw ?? '');
  if (poDate) out.poDate = poDate;

  const gstPct = get('gstPercent', () => firstMatch(fullText, RE.gstPercent));
  if (gstPct) out.gstPercent = Number(gstPct);

  const cur = get('currency', () => detectCurrencySymbol(fullText));
  if (cur) out.currency = cur;

  const grand = get('grandTotal', () => firstMatch(fullText, RE.grandTotal) ?? firstMatch(fullText, RE.grandTotalLoose));
  const grandV = grand ? num(grand) : null;
  if (grandV != null) out.grandTotal = grandV;

  const sub = get('subTotal', () => firstMatch(fullText, RE.subTotal));
  const subV = sub ? num(sub) : null;
  if (subV != null) out.subTotal = subV;

  const sgst = get('sgst', () => firstMatch(fullText, RE.gstAmount('SGST')));
  const cgst = get('cgst', () => firstMatch(fullText, RE.gstAmount('CGST')));
  const igst = get('igst', () => firstMatch(fullText, RE.gstAmount('IGST')));
  const sgstV = sgst ? num(sgst) : null;
  const cgstV = cgst ? num(cgst) : null;
  const igstV = igst ? num(igst) : null;
  if (sgstV != null) out.sgst = sgstV;
  if (cgstV != null) out.cgst = cgstV;
  if (igstV != null) out.igst = igstV;

  return out;
}

// ── buyer / seller blocks ───────────────────────────────────
interface BuyerBlock {
  name: string;
  attention?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
}

const TO_LABEL = /^(to|m\.?\s*s\.?|m\/s|m\/s\.?|bill\s*to|billed\s*to|sold\s*to|ship(?:ped)?\s*to|customer|buyer|party|consignee|purchaser|attention|attn|attn\.?|receiver)\b/i;

// Strip metadata labels from an address line ("State Code 27 A-35/2, ..." → "A-35/2, ...",
// "TAN 11 SATPUR, NASHIK" → "SATPUR, NASHIK"). Purely cosmetic — the user can edit later.
function cleanAddrLine(t: string): string {
  return t
    .replace(/^(?:state\s+code|state|district|region|country)\s*\d*\s*[:#\-.]?\s*/i, '')
    .replace(/^(?:tan|cin|pan|gstin|gst|vat|tin|phone|tel|fax|email|e-?mail|mobile|ref(?:erence)?|a\/c)\s*(?:no\.?|num(?:ber)?|code)?\s*\d*\s*[:#\-.]?\s*/i, '')
    .replace(/^[\s:#\-.,|]+/, '')
    .replace(/[\s,;|:]+$/, '')
    .trim();
}

function findBuyerBlock(lines: PoLine[]): BuyerBlock {
  let name = '';
  let attention: string | undefined;
  let address: string[] = [];
  let blockIdx = -1;

  // 1) Explicit "To / M/s / Buyer / Customer / Bill To" line names the buyer.
  const toIdx = lines.findIndex((l) => TO_LABEL.test(l.text.trim()));
  if (toIdx >= 0) {
    const raw = lines[toIdx].text.replace(TO_LABEL, '').replace(/^[\s:,#\-]+/, '').trim();
    if (raw) {
      const roleLike = /^(?:the\s+)?(?:purchase|procurement|buying|finance|admin|account|marketing|technical)[a-z\s]*manager|^purchase\s*$/i.test(raw);
      if (roleLike) {
        attention = raw;
        blockIdx = toIdx + 1;
      } else {
        name = raw;
        blockIdx = toIdx + 1;
      }
    } else {
      blockIdx = toIdx + 1;
    }
  }

  // If attention was captured, the company is the first following non-empty line.
  if (attention && blockIdx >= 0) {
    for (let i = blockIdx; i < lines.length; i++) {
      const t = lines[i].text.trim();
      if (!t) continue;
      if (isSectionHeader(t) || isMetaLine(t) || isTitleLine(t) || isTotalsLine(t)) break;
      name = t;
      blockIdx = i + 1;
      break;
    }
  }

  // 2) "Kind Attn: MR.SACHIN ..." style attention anywhere.
  if (!attention) {
    for (const l of lines) {
      const idx = l.text.search(/attn?\.?\s*[:#\-.]/i);
      if (idx >= 0) {
        const after = l.text.slice(idx).replace(/^.*?[:#\-.]\s*/, '');
        const v = cutAtNextLabel(after);
        if (v && v.length >= 2) {
          attention = v;
          break;
        }
      }
    }
  }

  // 3) Fallback: the company that owns the GSTIN (usually printed beside/above it).
  if (!name) {
    const gstIdx = lines.findIndex((l) => RE.gstin.test(l.text));
    if (gstIdx >= 0) {
      const gstLine = lines[gstIdx].text;
      const trailing = gstLine.replace(/^.*?GST\s*I?N?\s*[:\-]?\s*[0-9A-Z]{15}/i, '').replace(/^[:\-\s]+/, '').trim();
      const company = pickCompany(trailing);
      if (company) {
        name = company;
        blockIdx = gstIdx + 1;
      } else {
        const nameLines: string[] = [];
        for (let i = gstIdx - 1; i >= 0 && nameLines.length < 2; i--) {
          const t = lines[i].text.trim();
          if (!t) continue;
          if (isTitleLine(t) || isSectionHeader(t)) continue;
          if (/^(gst|pan|cin|tan|vendor|seller|supplier)/i.test(t)) continue;
          if (/^\d+[\/\-.]?\d*$/.test(t)) continue;
          nameLines.unshift(t);
        }
        if (nameLines.length) name = nameLines.join(' ').trim();
        blockIdx = gstIdx + 1;
      }
    }
  }

  // 4) Last resort: a company-suffix phrase near the top of the document.
  if (!name) {
    const topText = lines.slice(0, 15).map((l) => l.text).join(' ');
    const c = pickCompany(topText);
    if (c) name = c;
  }

  // Gather following lines as the address block.
  if (blockIdx >= 0) {
    let consecutiveBlanks = 0;
    for (let i = blockIdx; i < lines.length; i++) {
      const t = lines[i].text.trim();
      if (!t) {
        consecutiveBlanks++;
        if (consecutiveBlanks >= 2) break;
        continue;
      }
      if (consecutiveBlanks > 0) break;
      if (isSectionHeader(t) || isTotalsLine(t) || isDateLine(t) || isTitleLine(t)) break;
      // A new party / field section means the address block is over.
      if (/^(?:details\s+of\s+(?:supplier|buyer|consignee)|payment\s*terms?|del(?:ivery)?\.?\s*terms?|kind\s+attn|attn\s*[:#\-.]|subject\s*[:#\-.]|ref(?:erence)?\.?\s*[:#\-.]|our\s*ref|your\s*ref|supplier\s*[:#\-.]|vendor\s*[:#\-.]|delivery\s+to|ship(?:ped)?\s*to|bill\s+to|place\s+of|valid\s*[:#\-.]|freight\s*[:#\-.]|warranty\s*[:#\-.]|insurance\s*[:#\-.]|pay\s*mode|p\.?o\.?\s*(?:no|number|dt|date))\b/i.test(t)) break;
      const cleaned = cleanAddrLine(t);
      if (!cleaned) continue;
      // Pure code lines (PAN "AACCN5131C", CIN, TAN number) are metadata, not address.
      if (!/[ ,]/.test(cleaned) && /^[A-Z0-9][A-Z0-9\/._\-]*$/.test(cleaned)) continue;
      // Lines still carrying contact/meta info after cleaning.
      if (/^(gst|gstin|pan|cin|tan|tel|fax|email|e-?mail|phone|mobile|ref|p\.?o\.?|no\.?)/i.test(cleaned)) continue;
      if (/ph\b|phone|tel|fax|email|e-?mail|mobile|website|www\.|web\b/i.test(cleaned)) continue;
      if (address.length >= 4) break;
      address.push(cleaned);
    }
  }

  const addrJoined = cleanDescription(address.join(', '));
  let city: string | undefined;
  let state: string | undefined;
  let pincode: string | undefined;
  const pinMatch = addrJoined.match(RE.pincode);
  if (pinMatch) pincode = pinMatch[1];
  const stMatch = INDIAN_STATES.find((s) => addrJoined.toLowerCase().includes(s.toLowerCase()));
  if (stMatch) state = stMatch;
  if (!city) {
    const c = addrJoined.match(/([A-Za-z][A-Za-z .\-']{1,24}?)\s*,?\s*(?:pin|p\s*[co]?\.?\s*code|p\.?o\.?)\s*:?\s*[-–]?\s*\d{6}/i);
    if (c) city = c[1].trim().replace(/[,;:]+$/, '');
  }
  if (!city) {
    const m = addrJoined.match(/(?:^|,\s*)([A-Za-z][A-Za-z \-']{1,20}?)\s*[-–]?\s*[1-9][0-9]{5}\b/i);
    if (m) city = m[1].trim();
  }

  if (name && /^\d/.test(name) && addrJoined) name = '';

  return { name, attention, address: addrJoined, city, state, pincode };
}

function extractSupplier(lines: PoLine[]): string {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(/^(?:details\s+of\s+)?(supplier|vendor|seller|from)\b\s*[:#\-.]?\s*(.*)$/i);
    if (!m) continue;
    // The inline value often carries other fields too ("… Del.Terms :EX. YOUR WORKS P.Order No…");
    // cut it at the next section label so an Incoterm like "EX. YOUR WORKS" is never taken as a company.
    const inline = cutAtNextLabel(m[2].trim());
    const company = pickCompany(inline);
    if (company) return company;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const t = lines[j].text.trim();
      if (!t || isSectionHeader(t) || isMetaLine(t) || isTotalsLine(t)) break;
      const c = pickCompany(t);
      if (c) return c;
    }
  }
  return '';
}

// ── generic item table ──────────────────────────────────────
interface HeaderCol {
  role: 'sno' | 'hsn' | 'desc' | 'unit' | 'qty' | 'rate' | 'disc' | 'amount' | 'tax' | 'other';
  x0: number;
}

function classifyHeaderToken(raw: string): HeaderCol['role'] {
  const t = raw.replace(/[,:.]/g, '').toLowerCase();
  if (/^(sno|srno|sr|slno|serial|qtyno|sno)$/.test(t)) return 'sno';
  if (t === 'hsn' || t.startsWith('hsn') || t === 'sac' || t.startsWith('sac')) return 'hsn';
  if (/^(qty|qnty|quantity|qnt|quant|qty)$/.test(t)) return 'qty';
  if (/^(unit|uom|u\/m|unt|uom)$/.test(t)) return 'unit';
  if (/^(rate|price|unitprice|rateunit|basicrate|priceperunit|rateinr)$/.test(t) || /^rate/.test(t) || /^price/.test(t) || /^basic/.test(t)) return 'rate';
  if (/^(disc|discount|discountpercent|discpercent|dsc)$/.test(t) || /^disc/.test(t)) return 'disc';
  if (/^(amount|amt|total|gross|net|value|totalvalue|totalamount|netamount|grossamount|amountpayable|payable)$/.test(t) || /^amount/.test(t) || /^total/.test(t) || /^amt/.test(t) || /^value/.test(t)) return 'amount';
  if (/^(cgst|sgst|igst|gst|gstamt|utgst)$/.test(t)) return 'tax';
  if (/^(description|desc|particulars|item|items|itemdescription|specification|details|name|material|product|goods|services|service|part|partno|contents|itemname|materialdescription)$/.test(t) || /^desc/.test(t) || /^partic/.test(t) || /^item/.test(t)) return 'desc';
  if (/^(taxable|taxablevalue|taxableamount|tax)$/.test(t)) return 'tax';
  return 'other';
}

function findHeaderLine(lines: PoLine[]): { line: PoLine; cols: HeaderCol[]; index: number } | null {
  for (let idx = 0; idx < lines.length; idx++) {
    const l = lines[idx];
    const lowered = l.text.toLowerCase();
    if (!/(qty|quantity|rate|price|amount|particulars|description|item|hsn)/i.test(lowered)) continue;
    if (/payment\s*terms|delivery\s*terms|notes?|remarks?|signature|for\s+[a-z]*\s+(co|company|m\/s)/i.test(lowered)) continue;

    const tokens = l.text.split(/\s+/).filter(Boolean);
    if (tokens.length < 3) continue;
    const roles = tokens.map(classifyHeaderToken);
    const hasQty = roles.includes('qty');
    const hasRate = roles.includes('rate');
    const hasAmt = roles.includes('amount');
    const hasDesc = roles.includes('desc');
    if (!((hasQty && hasRate) || (hasQty && hasAmt) || (hasRate && hasAmt) || (hasDesc && (hasQty || hasRate || hasAmt)))) continue;

    const totalChars = tokens.reduce((s, tok) => s + tok.length + 1, 0);
    let cx = 0;
    const cols: HeaderCol[] = [];
    tokens.forEach((tok, i) => {
      const x0 = l.x + (cx / Math.max(1, totalChars)) * l.w;
      cx += tok.length + 1;
      if (roles[i] !== 'other') cols.push({ role: roles[i], x0 });
    });
    return { line: l, cols, index: idx };
  }
  return null;
}

// Unit words used to anchor quantity ("1 NOS", "10 PCS", "2 SET").
const QTY_UNIT = /^(nos?|pcs?|pieces?|kgs?|gms?|grams?|mt|mtrs?|metres?|meters?|ltrs?|litres?|ml|doz|dozen|pairs?|gallon|tons?|tonnes?|cft|sqft|sqm|sqmt|sqmtr|cum|units?|bundles?|rolls?|boxes?|packets?|sets?|lots?|kits?|bags?|pkts?|ft|feet|in|inch|mm|cm)$/i;

interface ParsedRow {
  description: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  unit?: string;
  hsnCode?: string;
  drawingNo?: string;
  revision?: string;
}

function buildDescription(tokens: Array<{ text: string; idx: number; isNum: boolean }>, consumed: Set<number>, unitIdx: number): string {
  const parts: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i === unitIdx) continue;
    if (t.isNum) {
      if (consumed.has(t.idx)) continue;
      if (/^\d{6,}$/.test(t.text)) continue; // long codes (HSN / ERP / part no)
      if (/^\d{1,3}$/.test(t.text) && i < 3 && !parts.length) continue; // leading SNo / qty-as-sno
      // keep other embedded numbers (e.g. "2.5" in "CABLE 2.5 SQMM")
    }
    if (/^[-–—/\\:;,.*=|+@x×]+$/.test(t.text)) continue;
    if (/^(hsn|sac|hsn\/sac|code|part|no|nos|dt|date|rev|revision|drg|dwg|drw|drawing|qty|quantity|uom|unit|each|per)$/i.test(t.text)) continue;
    parts.push(t.text);
  }
  return cleanDescription(parts.join(' '));
}

function finishRow(
  text: string,
  tokens: Array<{ text: string; idx: number; isNum: boolean }>,
  row: ParsedRow,
  consumed: Set<number>,
  unitIdx: number,
  opts?: { hasHsnCol?: boolean },
): ParsedRow {
  if (row.amount == null && row.quantity != null && row.rate != null) {
    row.amount = Math.round(row.quantity * row.rate * 100) / 100;
  }
  const full = text.replace(/\s+/g, ' ').trim();
  const hsn =
    firstMatch(full, RE.hsnLabel) ??
    tokens.find((t) => t.isNum && /^\d{6,8}$/.test(t.text))?.text ??
    (opts?.hasHsnCol ? tokens.find((t) => t.isNum && isCodeLike(t.text))?.text : undefined);
  if (hsn) row.hsnCode = hsn;
  const dr = extractDrawRev(full);
  if (dr.drawingNo) row.drawingNo = dr.drawingNo;
  if (dr.revision) row.revision = dr.revision;
  row.description = buildDescription(tokens, consumed, unitIdx);
  return row;
}

// Strip trailing tax-percentage values (e.g. "… 15,000.00 9.00 9.00") when the
// header declares CGST/SGST/IGST columns. Returns the surviving numerics plus the
// indices of the stripped ones (so they can be excluded from the description too).
function stripTaxPercentages(
  numerics: Array<{ text: string; idx: number; isNum: boolean }>,
  hasTax: boolean,
  nTax: number,
): { kept: Array<{ text: string; idx: number; isNum: boolean }>; removed: number[] } {
  if (!hasTax || numerics.length <= 3) return { kept: numerics, removed: [] };
  const working = [...numerics];
  let stripped = 0;
  while (stripped < nTax && working.length - stripped > 3) {
    const tok = working[working.length - 1 - stripped];
    const v = num(tok.text);
    if (v == null || v < 0 || v > 100) break;
    if (!Number.isInteger(v) && !/\.\d{2}$/.test(tok.text)) break;
    stripped++;
  }
  if (!stripped) return { kept: numerics, removed: [] };
  return {
    kept: working.slice(0, working.length - stripped),
    removed: working.slice(working.length - stripped).map((t) => t.idx),
  };
}

function parseItemRow(text: string, cols: HeaderCol[]): ParsedRow | null {
  const tokens = text.split(/\s+/).filter(Boolean).map((txt, idx) => ({ text: txt, idx, isNum: isNumericToken(txt) }));
  const numerics = tokens.filter((t) => t.isNum);
  if (numerics.length === 0) return null;

  const colRoles = cols.map((c) => c.role);
  const hasTax = colRoles.includes('tax');
  const nTax = colRoles.filter((r) => r === 'tax').length;

  const row: ParsedRow = { description: '' };
  const consumed = new Set<number>();
  let unitIdx = -1;
  let qtyNumIdx = -1;

  // unit-anchored qty ("1 NOS", "10 PCS")
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.isNum || i === 0 || !tokens[i - 1].isNum) continue;
    if (QTY_UNIT.test(t.text)) {
      unitIdx = i;
      row.unit = t.text.toUpperCase();
      qtyNumIdx = tokens[i - 1].idx;
      row.quantity = num(tokens[i - 1].text) ?? undefined;
      consumed.add(qtyNumIdx);
      break;
    }
  }

  // "@" / "x" rate separator ("10 NOS @ 1500.00")
  const sepIdx = tokens.findIndex((t) => /^[@x×]$/i.test(t.text));
  if (sepIdx > 0) {
    const before = tokens.slice(0, sepIdx).filter((t) => t.isNum);
    const after = tokens.slice(sepIdx + 1).filter((t) => t.isNum);
    if (before.length && after.length) {
      const q = num(before[before.length - 1].text);
      const r = num(after[0].text);
      if (q != null) {
        row.quantity = q;
        consumed.add(before[before.length - 1].idx);
      }
      if (r != null) {
        row.rate = r;
        consumed.add(after[0].idx);
      }
      if (after.length > 1) {
        const a = num(after[after.length - 1].text);
        if (a != null) {
          row.amount = a;
          consumed.add(after[after.length - 1].idx);
        }
      }
      return finishRow(text, tokens, row, consumed, unitIdx, { hasHsnCol: colRoles.includes('hsn') });
    }
  }

  if (qtyNumIdx >= 0) {
    // unit-anchored rows: the remaining numbers are [rate(, disc), amount]
    const hasDisc = colRoles.includes('disc');
    const { kept, removed } = stripTaxPercentages(numerics.filter((t) => t.idx !== qtyNumIdx), hasTax, nTax);
    removed.forEach((i) => consumed.add(i));
    const money = kept.filter((t) => !isCodeLike(t.text));
    if (money.length >= 2) {
      let ri = money.length - 1;
      row.amount = num(money[ri].text) ?? undefined;
      ri--;
      if (hasDisc && ri >= 0) ri--;
      if (ri >= 0) row.rate = num(money[ri].text) ?? undefined;
    } else if (money.length === 1) {
      row.rate = num(money[0].text) ?? undefined;
    }
    kept.forEach((t) => consumed.add(t.idx));
    return finishRow(text, tokens, row, consumed, unitIdx, { hasHsnCol: colRoles.includes('hsn') });
  }

  // no unit word → consume numerics right-to-left against the header's numeric columns
  const { kept, removed } = stripTaxPercentages(numerics, hasTax, nTax);
  removed.forEach((i) => consumed.add(i));
  // HSN / SAC codes (pure 4-8 digit integers) must never be mistaken for prices.
  // Assign qty/rate/amount from money-like tokens first; code tokens are dropped
  // from the description but still detected as the HSN code below.
  const codes = kept.filter((t) => isCodeLike(t.text));
  const working = kept.filter((t) => !isCodeLike(t.text));
  const rolesRight = colRoles.filter((r) => r === 'amount' || r === 'disc' || r === 'rate' || r === 'qty' || r === 'tax').reverse();
  for (const role of rolesRight) {
    if (working.length === 0) break;
    if (role === 'tax') continue;
    const tok = working.pop()!;
    const v = num(tok.text);
    if (v == null) continue;
    consumed.add(tok.idx);
    if (role === 'amount' && row.amount == null) row.amount = v;
    else if (role === 'rate' && row.rate == null) row.rate = v;
    else if (role === 'qty' && row.quantity == null) row.quantity = v;
    // 'disc' is consumed but its value is not part of the quotation
  }
  codes.forEach((t) => consumed.add(t.idx));

  // fallback when the header gave us no usable numeric columns
  if (row.amount == null && row.rate == null && row.quantity == null && working.length >= 2) {
    const last = working[working.length - 1];
    const second = working[working.length - 2];
    const a = num(last.text);
    const r = num(second.text);
    if (a != null) {
      row.amount = a;
      consumed.add(last.idx);
    }
    if (r != null) {
      row.rate = r;
      consumed.add(second.idx);
    }
  }

  return finishRow(text, tokens, row, consumed, unitIdx, { hasHsnCol: colRoles.includes('hsn') });
}

function parseNumericFallback(text: string): PoItem | null {
  const tokens = text.split(/\s+/).filter(Boolean).map((txt, idx) => ({ text: txt, idx, isNum: isNumericToken(txt) }));
  const numerics = tokens.filter((t) => t.isNum);
  if (!numerics.length) return null;

  const row: ParsedRow = { description: '' };
  const consumed = new Set<number>();
  let unitIdx = -1;
  let qtyNumIdx = -1;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.isNum || i === 0 || !tokens[i - 1].isNum) continue;
    if (QTY_UNIT.test(t.text)) {
      unitIdx = i;
      row.unit = t.text.toUpperCase();
      qtyNumIdx = tokens[i - 1].idx;
      row.quantity = num(tokens[i - 1].text) ?? undefined;
      consumed.add(qtyNumIdx);
      break;
    }
  }

  if (qtyNumIdx >= 0) {
    const money = numerics.filter((t) => t.idx !== qtyNumIdx && !isCodeLike(t.text));
    if (money.length >= 2) {
      row.amount = num(money[money.length - 1].text) ?? undefined;
      row.rate = num(money[money.length - 2].text) ?? undefined;
    } else if (money.length === 1) {
      row.rate = num(money[0].text) ?? undefined;
    } else {
      return null;
    }
    numerics.forEach((t) => consumed.add(t.idx));
  } else {
    const money = numerics.filter((t) => !isCodeLike(t.text));
    if (money.length < 3) return null;
    numerics.forEach((t) => consumed.add(t.idx));
    row.amount = num(money[money.length - 1].text) ?? undefined;
    row.rate = num(money[money.length - 2].text) ?? undefined;
    row.quantity = num(money[money.length - 3].text) ?? undefined;
  }

  const finished = finishRow(text, tokens, row, consumed, unitIdx);
  return {
    description: finished.description,
    hsnCode: finished.hsnCode,
    drawingNo: finished.drawingNo,
    revision: finished.revision,
    unit: finished.unit,
    quantity: finished.quantity,
    rate: finished.rate,
    amount: finished.amount,
  };
}

export function extractTable(lines: PoLine[]): PoItem[] {
  const headerInfo = findHeaderLine(lines);
  const items: PoItem[] = [];
  let active = false; // past the header (or past the first fallback row)
  let closed = false; // totals block reached — no more items
  let prevY = -Infinity;
  let prevPage = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const text = l.text.trim();
    if (!text) continue;
    const gap = prevPage >= 0 && l.page !== prevPage ? Infinity : l.y - prevY;
    prevPage = l.page;

    if (headerInfo && i === headerInfo.index) {
      active = true;
      prevY = l.y;
      continue;
    }
    if (isTotalsLine(text)) {
      if (active) closed = true;
      prevY = l.y;
      continue;
    }
    if (closed) continue;
    if (isSectionHeader(text) || isDateLine(text) || looksLikeHeader(text)) {
      prevY = l.y;
      continue;
    }

    if (headerInfo) {
      if (!active) {
        prevY = l.y;
        continue;
      }
      if (isMetaLine(text) || isDrawRevMetaLine(text) || (items.length === 0 && isSubHeader(text))) {
        prevY = l.y;
        continue;
      }

      const row = parseItemRow(text, headerInfo.cols);
      const lastItem = items[items.length - 1];

      if (row) {
        if (lastItem && !lastItem.quantity && !lastItem.rate && !lastItem.amount && gap < 12 && lastItem.description) {
          Object.assign(lastItem, {
            quantity: row.quantity,
            rate: row.rate,
            amount: row.amount,
            unit: row.unit,
            hsnCode: row.hsnCode || lastItem.hsnCode,
            drawingNo: row.drawingNo || lastItem.drawingNo,
            revision: row.revision || lastItem.revision,
            description: [lastItem.description, row.description].filter(Boolean).join(' ').trim(),
          });
        } else {
          items.push({
            description: row.description || text,
            hsnCode: row.hsnCode,
            drawingNo: row.drawingNo,
            revision: row.revision,
            unit: row.unit,
            quantity: row.quantity,
            rate: row.rate,
            amount: row.amount,
          });
        }
        prevY = l.y;
        continue;
      }

      // non-numeric line → wrapped-description continuation for the last row
      if (lastItem && gap < 14 && text.length < 220) {
        lastItem.description = [lastItem.description, text].filter(Boolean).join(' ').trim();
      } else if (!lastItem) {
        items.push({ description: text });
      }
      prevY = l.y;
      continue;
    }

    // No header at all → conservative numeric-row fallback.
    if (isMetaLine(text) || isDrawRevMetaLine(text)) {
      prevY = l.y;
      continue;
    }
    const numericCount = (text.match(/\d/g) || []).length;
    if (numericCount >= 2 || /[@×x]/.test(text)) {
      const row = parseNumericFallback(text);
      if (row) {
        items.push(row);
        active = true;
        prevY = l.y;
      }
    }
  }

  items.forEach((it) => {
    if ((it.amount == null || it.amount === 0) && it.quantity != null && it.rate != null) {
      it.amount = Math.round(it.quantity * it.rate * 100) / 100;
    }
  });

  return items.filter((it) => it.description || it.quantity != null || it.rate != null || it.amount != null);
}

// ── terms / notes sections ──────────────────────────────────
function extractSections(lines: PoLine[]): Partial<PoData> {
  const out: Partial<PoData> = {};
  const fullText = lines.map((l) => l.text).join('\n');

  const sectionPatterns: Array<{ key: keyof PoData; start: RegExp }> = [
    { key: 'paymentTerms', start: /^\s*(payment\s*terms?|terms?\s*of\s*payment|pay\s*terms?)/i },
    { key: 'deliveryTerms', start: /^\s*(del(?:ivery)?\.?\s*terms?|terms?\s*of\s*delivery)/i },
    { key: 'validity', start: /^\s*(valid(?:ity)?)\b/i },
    { key: 'freight', start: /^\s*freight\b/i },
    { key: 'remarks', start: /^\s*remarks?\b/i },
    { key: 'notes', start: /^\s*notes?\b/i },
  ];

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text.trim();
    if (!t) continue;
    const entry = sectionPatterns.find((p) => p.start.test(t));
    if (!entry) continue;
    if (out[entry.key]) continue;

    let value = t.replace(entry.start, '').replace(/^[\s:;#\-.,]+/, '').trim();
    value = cutAtNextLabel(value);

    if (!value && i + 1 < lines.length) {
      const nextT = lines[i + 1].text.trim();
      if (nextT && !isMetaLine(nextT) && !isTotalsLine(nextT) && !isSectionHeader(nextT) && !isDateLine(nextT)) {
        value = cutAtNextLabel(nextT);
      }
    }
    if (value) out[entry.key] = value as never;
  }

  // inline fallback: labels buried in the middle of a line
  // ("Kind Attn: MR.SACHIN Mobile Transp. :- Payment Terms :45 Days ...")
  if (!out.paymentTerms) {
    const m = fullText.match(/(?:^|[\s:;#\-.])(?:payment\s*terms?|terms?\s+of\s+payment)\s*[:#\-.]?\s*([A-Za-z0-9][^\n;|]{0,40})/i);
    if (m) {
      const v = cutAtNextLabel(m[1]);
      if (v) out.paymentTerms = v as never;
    }
  }
  if (!out.deliveryTerms) {
    const m = fullText.match(/(?:^|[\s:;#\-.])(?:del(?:ivery)?\.?\s*terms?|terms?\s+of\s+delivery)\s*[:#\-.]?\s*([A-Za-z0-9][^\n;|]{0,30})/i);
    if (m) {
      const v = cutAtNextLabel(m[1]);
      if (v) out.deliveryTerms = v as never;
    }
  }
  if (!out.validity) {
    const m = fullText.match(/(?:^|[\s:;#\-.])(?:valid\s*(?:up\s*to|upto|till)?|validity)\s*[:#\-.]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i);
    if (m) out.validity = m[1] as never;
  }
  if (!out.freight) {
    const m = fullText.match(/(?:^|[\s:;#\-.])(?:freight\s*(?:charges)?)\s*[:#\-.]?\s*([A-Za-z0-9][^\n;|]{0,25})/i);
    if (m) {
      const v = cutAtNextLabel(m[1]);
      if (v && !(/\d/.test(v) && /\s/.test(v))) out.freight = v as never;
    }
  }

  return out;
}

// ── main entry ──────────────────────────────────────────────
export interface ExtractionResult {
  po: PoData;
  confidence: number;
  warnings: string[];
}

export function extractPo(pages: PoLine[][]): ExtractionResult {
  const warnings: string[] = [];
  const allLines = pages.flat().sort((a, b) => a.page - b.page || a.y - b.y);
  if (allLines.length === 0) {
    return { po: { items: [] }, confidence: 0, warnings: ['No text was found in this PDF.'] };
  }

  const scalars = safe('scalars', {}, () => extractScalars(allLines));
  const buyer = safe(
    'buyer-block',
    { name: '', attention: undefined as string | undefined, address: '', city: undefined as string | undefined, state: undefined as string | undefined, pincode: undefined as string | undefined },
    () => findBuyerBlock(allLines),
  );
  const sections = safe('sections', {}, () => extractSections(allLines));
  const rawItems = safe('items-table', [] as PoItem[], () => extractTable(allLines));
  const items = rawItems.filter((it) => it.description || it.quantity || it.rate || it.amount);

  const po: PoData = {
    ...scalars,
    ...sections,
    customerName: buyer.name || undefined,
    attention: buyer.attention,
    address: buyer.address || undefined,
    city: buyer.city,
    state: buyer.state,
    pincode: buyer.pincode,
    items,
  };

  const supplier = safe('supplier-block', '', () => extractSupplier(allLines));
  if (supplier) po.supplier = supplier;

  if (!po.poNumber) warnings.push('PO number not detected — add it manually.');
  if (items.length === 0) warnings.push('No line items detected — add items manually.');
  if (!po.grandTotal) warnings.push('Grand total not detected — totals are calculated automatically.');

  const found = [
    po.poNumber, po.poDate, po.customerName, po.email, po.gstin, po.phone,
    po.address, po.paymentTerms, po.grandTotal !== undefined ? 'present' : undefined,
  ].filter(isNonEmpty).length;
  const confidence = Math.min(100, Math.round((found / 9) * 100) + (items.length ? 10 : 0));

  return { po, confidence, warnings };
}
