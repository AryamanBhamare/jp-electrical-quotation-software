import { forwardRef, useMemo } from 'react';
import type { Quotation, QuoteTemplate } from '@shared/types';
import { computeTotals } from '@/lib/calculations';
import { formatDate, formatNumber } from '@/lib/format';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  quote: Quotation;
  template: QuoteTemplate;
  className?: string;
}

function CompanyLogo({ quote, template }: { quote: Quotation; template: QuoteTemplate }) {
  if (!quote.showLogo || !quote.company.logo) return null;
  return (
    <img
      src={quote.company.logo}
      alt="Company logo"
      style={{ width: template.logoSize, maxHeight: template.logoSize * 0.55, objectFit: 'contain' }}
      className="rounded"
    />
  );
}

function SignatureBlock({ quote, template }: { quote: Quotation; template: QuoteTemplate }) {
  const sigStyle = { width: template.signatureSize, height: template.signatureSize * 0.42, objectFit: 'contain' as const };
  return (
    <div className="mt-8 flex flex-col items-end text-[11px] leading-relaxed" style={{ color: '#000' }}>
      <div className="font-bold text-[12px]">THANKING YOU</div>
      <div className="font-semibold">
        {quote.company.titlePrefix ? `${quote.company.titlePrefix} ` : ''}
        {quote.company.name}
      </div>
      {quote.showSignature && quote.company.signatory.image ? (
        <img src={quote.company.signatory.image} alt="Signature" className="mb-1 mix-blend-multiply" style={sigStyle} />
      ) : null}
      <div className="mt-1.5">{quote.company.signatory.name}</div>
      <div style={{ color: '#374151' }}>{quote.company.signatory.role}</div>
      {quote.showStamp && quote.company.stamp ? (
        <img src={quote.company.stamp} alt="Stamp" className="mt-2 mix-blend-multiply" style={{ width: template.stampSize * 0.9, height: 'auto' }} />
      ) : null}
    </div>
  );
}

function NoteLines({ notes }: { notes: string }) {
  const lines = notes
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
  return (
    <div className="mt-1 text-[10.5px]" style={{ color: '#000' }}>
      {lines.map((n, idx) => (
        <div key={idx} className="flex gap-2">
          <span>•</span>
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

const QuoteDocument = forwardRef<HTMLDivElement, Props>(({ quote, template, className }, ref) => {
  const totals = useMemo(
    () => computeTotals(quote.items, quote.gst, quote.discount, quote.roundOff, quote.details.currency),
    [quote.items, quote.gst, quote.discount, quote.roundOff, quote.details.currency],
  );
  const sym = quote.details.currency === 'INR' ? '₹' : quote.details.currency;
  const accent = template.accent;
  const pad = template.pageMargin;

  const upi = quote.company.bank.upi;
  const qrValue = upi
    ? `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(quote.company.name)}&am=${totals.rounded}&cu=INR`
    : null;

  const ts = template.tableStyle ?? 'bordered';
  const tdBorder = ts === 'minimal' ? 'border-y border-slate-300' : 'border border-slate-400';
  const td = `${tdBorder} px-1.5 py-1 align-middle`;
  const th = `${td} font-semibold text-[10.5px]`;
  const rowBg = (i: number) => (ts === 'zebra' ? (i % 2 === 1 ? '#f8fafc' : '#ffffff') : undefined);

  const companyNameLine = `${quote.company.titlePrefix ? `${quote.company.titlePrefix} ` : ''}${quote.company.name}`;
  const contactLine = [quote.company.contactPerson, quote.company.phone].filter(Boolean).join(' | ');
  const companyTaxLine = [
    quote.company.gstin ? `GSTIN: ${quote.company.gstin}` : '',
    quote.company.pan ? `PAN: ${quote.company.pan}` : '',
  ].filter(Boolean).join('  |  ');
  const isInvoice = quote.docType === 'invoice';
  const inv = quote.invoice ?? null;
  const customerContact = [
    quote.customer.gstin ? `GSTIN: ${quote.customer.gstin}` : '',
    quote.customer.pan ? `PAN: ${quote.customer.pan}` : '',
    quote.customer.phone ? `Ph: ${quote.customer.phone}` : '',
    quote.customer.email ? `Email: ${quote.customer.email}` : '',
  ].filter(Boolean).join('  |  ');
  const customerCityLine = [quote.customer.city, quote.customer.state].filter(Boolean).join(', ');
  const hasPo = Boolean(quote.details.poNumber);

  const invoiceRow = (label: string, value: string) =>
    value ? (
      <tr>
        <td className="border border-black bg-slate-100 px-2 py-1 font-semibold">{label}</td>
        <td className="border border-black px-2 py-1 text-right">{value}</td>
      </tr>
    ) : null;

  return (
    <div
      ref={ref}
      className={`quote-page ${template.font === 'serif' ? 'serif' : ''} relative overflow-hidden ${className ?? ''}`}
      style={{ padding: pad, fontSize: template.bodyFontSize, lineHeight: 1.45, color: '#000' }}
      data-quote-id={quote.id}
    >
      {/* watermark */}
      {quote.watermark ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ opacity: template.watermarkOpacity, color: accent }}
        >
          <span className="rotate-[-30deg] whitespace-nowrap text-[90px] font-bold tracking-widest">{quote.watermark}</span>
        </div>
      ) : null}

      {/* ── HEADER: company (left/center) · quotation no/date ── */}
      <header className={template.headerAlign === 'center' ? 'relative flex flex-col items-center text-center' : 'relative flex items-start justify-between gap-4'}>
        <div className={template.headerAlign === 'center' ? 'flex flex-col items-center gap-1' : 'flex items-start gap-3'}>
          <CompanyLogo quote={quote} template={template} />
          <div>
            <div className="text-[15px] font-extrabold uppercase leading-tight" style={{ color: '#000' }}>
              {companyNameLine}
            </div>
            {quote.company.email ? (
              <div className="mt-0.5 text-[10px]">Email: {quote.company.email}</div>
            ) : null}
            {quote.company.businessDesc ? (
              <div className="text-[10px] font-semibold">{quote.company.businessDesc}</div>
            ) : null}
            {quote.company.address ? (
              <div className="whitespace-pre-line text-[10px]">{quote.company.address}</div>
            ) : null}
            {contactLine ? (
              <div className="text-[10px]">Contact: {contactLine}</div>
            ) : null}
            {companyTaxLine ? (
              <div className="mt-0.5 text-[10px]">{companyTaxLine}</div>
            ) : null}
          </div>
        </div>
        <div className="text-[10px]" style={{ color: '#000' }}>
          {!isInvoice ? (
            <div className={template.headerAlign === 'center' ? 'mt-1 flex items-center justify-center gap-4' : 'text-right'}>
              {quote.details.quoteNo ? (
                <span>
                  Quotation No: <span className="font-semibold">{quote.details.quoteNo}</span>
                </span>
              ) : null}
              {quote.details.quoteDate ? (
                <span>
                  Date: <span className="font-semibold">DT.{formatDate(quote.details.quoteDate)}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {/* TAX INVOICE title */}
      {isInvoice ? (
        <div className="mt-2 text-center text-[14px] font-extrabold uppercase tracking-wide" style={{ color: '#000' }}>
          Tax Invoice
        </div>
      ) : null}

      {/* divider */}
      <div className="mt-3 h-px w-full" style={{ background: template.showHeaderBorder ? '#000' : '#94a3b8' }} />

      {/* copy-type band (invoice) */}
      {isInvoice && inv?.copyType ? (
        <div className="mt-2 flex justify-center">
          <div className="inline-block border border-black px-4 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            {inv.copyType}
          </div>
        </div>
      ) : null}

      {/* ── BILL TO (left) · INVOICE DETAILS (right) ── */}
      {isInvoice ? (
        <div className="mt-4 grid grid-cols-2 gap-5 text-[11px]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#6b7280' }}>Bill To</div>
            {quote.customer.attention ? <div className="mt-1 font-semibold">{quote.customer.attention}</div> : null}
            {quote.customer.company || quote.customer.name ? (
              <div className="text-[12px] font-bold">{quote.customer.company || quote.customer.name}</div>
            ) : null}
            {quote.customer.address ? <div className="whitespace-pre-line">{quote.customer.address}</div> : null}
            {customerCityLine || quote.customer.pincode ? (
              <div>
                {customerCityLine}
                {quote.customer.pincode ? `${customerCityLine ? ', ' : ''}${quote.customer.pincode}` : ''}
              </div>
            ) : null}
            <div className="mt-1">
              {quote.customer.gstin ? (
                <div>
                  GSTIN: <span className="font-semibold">{quote.customer.gstin}</span>
                </div>
              ) : null}
              {quote.customer.pan ? (
                <div>
                  PAN: <span className="font-semibold">{quote.customer.pan}</span>
                </div>
              ) : null}
              {(quote.customer.phone || quote.customer.email) ? (
                <div className="text-[10.5px]" style={{ color: '#374151' }}>
                  {[quote.customer.phone, quote.customer.email].filter(Boolean).join('  ·  ')}
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <table className="w-full border-collapse text-[11px]" style={{ color: '#000' }}>
              <tbody>
                {invoiceRow('Invoice No.', inv?.invoiceNo ?? '')}
                {invoiceRow('Invoice Date', inv?.invoiceDate ? formatDate(inv.invoiceDate) : '')}
                {invoiceRow('Ref / P.O. No', quote.details.poNumber || quote.details.reference || '')}
                {invoiceRow('P.O. Date', quote.details.poDate ? formatDate(quote.details.poDate) : '')}
                {invoiceRow(
                  'Place of Supply',
                  inv?.placeOfSupply ? `${inv.placeOfSupply}${inv.stateCode ? ` (${inv.stateCode})` : ''}` : '',
                )}
                {invoiceRow('IRN', inv?.irn ?? '')}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── CUSTOMER (quotation) ── */
        <div className="mt-4 text-[11px]">
          <div className="font-semibold">To,</div>
          {quote.customer.attention ? <div className="font-semibold">{quote.customer.attention}</div> : null}
          {quote.customer.company || quote.customer.name ? (
            <div className="text-[12px] font-bold">{quote.customer.company || quote.customer.name}</div>
          ) : null}
          {quote.customer.address ? <div className="whitespace-pre-line">{quote.customer.address}</div> : null}
          {customerCityLine || quote.customer.pincode ? (
            <div>
              {customerCityLine}
              {quote.customer.pincode ? `${customerCityLine ? ', ' : ''}${quote.customer.pincode}` : ''}
            </div>
          ) : null}
          {customerContact ? <div className="mt-0.5">{customerContact}</div> : null}
        </div>
      )}

      {/* ── SUBJECT ── */}
      {quote.details.subject ? (
        <div className="mt-4 text-[11px]">
          <span className="font-bold">SUB:</span> {quote.details.subject}
        </div>
      ) : null}

      {/* ── REFERENCE ── */}
      {!isInvoice && (hasPo || quote.details.reference) ? (
        <div className="mt-1 text-[11px]">
          <span className="font-bold">REF:</span>{' '}
          {hasPo ? `YOUR P.ORDER NO. ${quote.details.poNumber}` : quote.details.reference || ''}
          {hasPo && quote.details.poDate ? `  DT.${formatDate(quote.details.poDate)}` : ''}
        </div>
      ) : null}

      {/* ── OPENING PARAGRAPH ── */}
      {quote.introduction ? (
        <div className="mt-4 whitespace-pre-line text-[11px]">{quote.introduction}</div>
      ) : null}

      {/* ── MAIN TABLE ── */}
      <table className="mt-4 w-full border-collapse text-[10.5px]" style={{ color: '#000' }}>
        <thead>
          <tr>
            {['SR NO', 'DESCRIPTION', 'HSN CODE', 'QTY', 'PRICE', 'AMOUNT'].map((h, i) => (
              <th
                key={h}
                className={`${th} text-left`}
                style={{ background: template.tableHeaderBg, width: i === 1 ? '46%' : undefined }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quote.items.length === 0 ? (
            <tr className="print-avoid-break">
              <td className={td} colSpan={6}>
                <div className="py-3 text-center italic" style={{ color: '#9ca3af' }}>
                  No items added yet
                </div>
              </td>
            </tr>
          ) : (
            quote.items.map((it, i) => (
              <tr key={it.id} className="print-avoid-break" style={{ background: rowBg(i) }}>
                <td className={td} style={{ textAlign: 'center' }}>{i + 1}</td>
                <td className={td}>
                  <div className="whitespace-pre-line">{it.description}</div>
                  {it.drawingNo || it.revision ? (
                    <div className="text-[9.5px]" style={{ color: '#374151' }}>
                      Drg No. {it.drawingNo || '-'}, Rev No. {it.revision || '-'}
                    </div>
                  ) : null}
                  {it.unit ? (
                    <div className="text-[9.5px]" style={{ color: '#374151' }}>
                      Unit: {it.unit}
                    </div>
                  ) : null}
                </td>
                <td className={td} style={{ textAlign: 'center' }}>{it.hsnCode}</td>
                <td className={td} style={{ textAlign: 'center' }}>{it.quantity}</td>
                <td className={td} style={{ textAlign: 'right' }}>{it.rate ? formatNumber(it.rate) : ''}</td>
                <td className={td} style={{ textAlign: 'right' }}>{it.amount.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ── TOTALS (right aligned) ── */}
      <div className="mt-3 flex justify-end">
        <table className="w-[42%] border-collapse text-[10.5px]" style={{ color: '#000' }}>
          <tbody>
            <tr>
              <td className={`${td} text-right font-medium`}>SUB TOTAL</td>
              <td className={`${td} text-right`}>{sym} {totals.subTotal.toFixed(2)}</td>
            </tr>
            {totals.sgst > 0 ? (
              <tr>
                <td className={`${td} text-right font-medium`}>SGST {quote.gst.sgst}%</td>
                <td className={`${td} text-right`}>{sym} {totals.sgst.toFixed(2)}</td>
              </tr>
            ) : null}
            {totals.cgst > 0 ? (
              <tr>
                <td className={`${td} text-right font-medium`}>CGST {quote.gst.cgst}%</td>
                <td className={`${td} text-right`}>{sym} {totals.cgst.toFixed(2)}</td>
              </tr>
            ) : null}
            {totals.igst > 0 ? (
              <tr>
                <td className={`${td} text-right font-medium`}>IGST {quote.gst.igst}%</td>
                <td className={`${td} text-right`}>{sym} {totals.igst.toFixed(2)}</td>
              </tr>
            ) : null}
            {totals.discount > 0 ? (
              <tr>
                <td className={`${td} text-right font-medium`}>
                  DISCOUNT{quote.discount.type === 'percent' ? ` ${quote.discount.value}%` : ''}
                </td>
                <td className={`${td} text-right`}>- {sym} {totals.discount.toFixed(2)}</td>
              </tr>
            ) : null}
            {quote.roundOff && totals.roundOff !== 0 ? (
              <tr>
                <td className={`${td} text-right font-medium`}>ROUND OFF</td>
                <td className={`${td} text-right`}>{sym} {totals.roundOff.toFixed(2)}</td>
              </tr>
            ) : null}
            <tr>
              <td className={`${td} text-right font-bold text-[11.5px]`} style={{ background: template.tableHeaderBg }}>
                GRAND TOTAL
              </td>
              <td className={`${td} text-right font-bold text-[11.5px]`} style={{ background: template.tableHeaderBg }}>
                {sym} {totals.rounded.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* amount in words */}
      <div className="mt-2 text-[10.5px]" style={{ color: '#000' }}>
        <span className="font-semibold">Amount in Words: </span>
        {totals.amountInWords}
      </div>

      {/* ── TERMS ── */}
      {quote.terms ? (
        <div className="mt-4">
          <div className="text-[11px] font-bold">TERMS &amp; CONDITIONS</div>
          <div className="mt-1 whitespace-pre-line text-[10.5px]">{quote.terms}</div>
        </div>
      ) : null}

      {/* ── NOTES (bullet points) ── */}
      {quote.notes ? (
        <div className="mt-4">
          <div className="text-[11px] font-bold">NOTE:-</div>
          <NoteLines notes={quote.notes} />
        </div>
      ) : null}

      {/* ── payment / delivery meta ── */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[10.5px]" style={{ color: '#374151' }}>
        {quote.details.paymentTerms ? (
          <div>
            <span className="font-semibold">Payment Terms: </span>
            {quote.details.paymentTerms}
          </div>
        ) : null}
        {quote.details.deliveryTerms ? (
          <div>
            <span className="font-semibold">Delivery: </span>
            {quote.details.deliveryTerms}
          </div>
        ) : null}
        {quote.details.freight ? (
          <div>
            <span className="font-semibold">Freight: </span>
            {quote.details.freight}
          </div>
        ) : null}
        {quote.details.validity ? (
          <div>
            <span className="font-semibold">Validity: </span>
            {quote.details.validity}
          </div>
        ) : null}
      </div>

      {/* ── SIGNATURE (bottom right) + QR ── */}
      <div className="flex items-end justify-between">
        <div>
          {quote.showQr && qrValue ? (
            <div className="flex flex-col items-center gap-1">
              <QRCodeSVG value={qrValue} size={86} />
              <span className="text-[8.5px]" style={{ color: '#6b7280' }}>
                Scan to pay
              </span>
            </div>
          ) : null}
        </div>
        <SignatureBlock quote={quote} template={template} />
      </div>

      {/* ── FOOTER ── */}
      {template.showFooterLine ? <div className="mt-4 h-px w-full" style={{ background: '#94a3b8' }} /> : null}
      <footer className="mt-2 text-center text-[9.5px]" style={{ color: '#6b7280' }}>
        {quote.footer || `${companyNameLine}  •  ${quote.company.phone}  •  ${quote.company.email}`}
      </footer>
    </div>
  );
});
QuoteDocument.displayName = 'QuoteDocument';

export default QuoteDocument;
