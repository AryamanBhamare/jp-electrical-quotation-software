import type { DiscountConfig, GstConfig, QuoteItem, Totals } from '@shared/types';
import { numberToWordsINR } from './amountToWords';

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function itemAmount(item: Pick<QuoteItem, 'quantity' | 'rate'>): number {
  const q = Number(item.quantity) || 0;
  const r = Number(item.rate) || 0;
  return round2(q * r);
}

export function subTotal(items: Array<Pick<QuoteItem, 'quantity' | 'rate'>>): number {
  return round2(items.reduce((sum, it) => sum + itemAmount(it), 0));
}

export function discountAmount(discount: DiscountConfig, subtotal: number): number {
  const v = Number(discount.value) || 0;
  if (discount.type === 'percent') return round2((subtotal * v) / 100);
  return round2(Math.min(v, subtotal));
}

export function taxAmounts(gst: GstConfig, taxable: number) {
  const cgst = gst.type === 'cgst_sgst' ? round2((taxable * (Number(gst.cgst) || 0)) / 100) : 0;
  const sgst = gst.type === 'cgst_sgst' ? round2((taxable * (Number(gst.sgst) || 0)) / 100) : 0;
  const igst = gst.type === 'igst' ? round2((taxable * (Number(gst.igst) || 0)) / 100) : 0;
  return { cgst, sgst, igst, taxTotal: round2(cgst + sgst + igst) };
}

export function computeTotals(
  items: Array<Pick<QuoteItem, 'quantity' | 'rate'>>,
  gst: GstConfig,
  discount: DiscountConfig,
  roundOff: boolean,
  currencyCode = 'INR',
): Totals {
  const sub = subTotal(items);
  const disc = discountAmount(discount, sub);
  const taxable = round2(sub - disc);
  const tax = taxAmounts(gst, taxable);
  const grand = round2(taxable + tax.taxTotal);
  const rounded = roundOff ? Math.round(grand) : grand;
  const currencyName = currencyCode === 'INR' ? 'Rupees' : currencyCode.toUpperCase();
  return {
    subTotal: sub,
    discount: disc,
    taxable,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    taxTotal: tax.taxTotal,
    grandTotal: grand,
    rounded,
    roundOff: round2(rounded - grand),
    amountInWords: numberToWordsINR(rounded, currencyName),
  };
}
