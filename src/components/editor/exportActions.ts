import { toast } from 'sonner';
import type { Quotation, QuoteTemplate } from '@shared/types';
import { computeTotals } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import { buildPdf } from '@/services/exportPdf';
import { buildDocx } from '@/services/exportDocx';
import { quotationToStandaloneHtml, copyHtmlToClipboard } from '@/services/exportHtml';
import { exportQuotationExcel } from '@/services/exportExcel';
import { quotationToCsv, downloadText, downloadBlob } from '@/lib/csv';
import { encodeDataURL, buildShareUrl } from '@/lib/codec';
import { useStore } from '@/store/useStore';

export function exportActions() {
  const store = useStore.getState();
  return {
    async downloadPdf(q: Quotation, t: QuoteTemplate) {
      const blob = await buildPdf(q, t);
      downloadBlob(blob, `${q.details.quoteNo}.pdf`);
      store.logAudit('EXPORT_PDF', q.details.quoteNo);
      store.trackExported();
      toast.success('PDF downloaded');
    },
    async downloadDocx(q: Quotation, t: QuoteTemplate) {
      const blob = await buildDocx(q, t);
      downloadBlob(blob, `${q.details.quoteNo}.docx`);
      store.logAudit('EXPORT_DOCX', q.details.quoteNo);
      store.trackExported();
      toast.success('Word document downloaded');
    },
    downloadJson(q: Quotation) {
      downloadText(JSON.stringify(q, null, 2), `${q.details.quoteNo}.json`, 'application/json');
      store.logAudit('EXPORT_PDF', `${q.details.quoteNo} (json)`);
      toast.success('JSON saved');
    },
    downloadExcel(q: Quotation) {
      exportQuotationExcel(q);
      store.logAudit('EXPORT_EXCEL', q.details.quoteNo);
      store.trackExported();
    },
    downloadCsv(q: Quotation) {
      downloadText(quotationToCsv(q), `${q.details.quoteNo}.csv`, 'text/csv');
      store.logAudit('EXPORT_CSV', q.details.quoteNo);
    },
    print(q: Quotation) {
      store.logAudit('PRINT', q.details.quoteNo);
      window.print();
    },
    async copyHtml(q: Quotation, docEl: HTMLElement | null) {
      const ok = await copyHtmlToClipboard(docEl);
      if (ok) {
        store.logAudit('EXPORT_PDF', `${q.details.quoteNo} (html)`);
        toast.success('Quotation HTML copied');
      } else {
        toast.error('Could not copy HTML');
      }
    },
    downloadHtml(q: Quotation, docEl: HTMLElement | null) {
      const html = quotationToStandaloneHtml(q, docEl);
      downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${q.details.quoteNo}.html`);
      toast.success('HTML saved');
    },
    async share(q: Quotation) {
      const code = await encodeDataURL(q);
      const url = buildShareUrl(code);
      await navigator.clipboard.writeText(url);
      store.logAudit('SHARE', q.details.quoteNo);
      toast.success('Shareable link copied to clipboard');
      return url;
    },
    async shareWhatsApp(q: Quotation) {
      const code = await encodeDataURL(q);
      const url = buildShareUrl(code);
      const t = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
      const sym = q.details.currency === 'INR' ? '₹' : q.details.currency;
      const text = encodeURIComponent(
        `Quotation ${q.details.quoteNo} — ${formatMoney(t.rounded, sym)}\n${url}`,
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
      store.logAudit('SHARE', `${q.details.quoteNo} (whatsapp)`);
    },
    async shareEmail(q: Quotation) {
      const code = await encodeDataURL(q);
      const url = buildShareUrl(code);
      const t = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
      const sym = q.details.currency === 'INR' ? '₹' : q.details.currency;
      window.location.href = `mailto:${q.customer.email || ''}?subject=${encodeURIComponent(`Quotation ${q.details.quoteNo}`)}&body=${encodeURIComponent(`Dear ${q.customer.company || q.customer.name},\n\nPlease find our quotation ${q.details.quoteNo} for ${formatMoney(t.rounded, sym)}.\n\nOpen online: ${url}\n\n${q.company.signatory.name}\n${q.company.name}`)}`;
      store.logAudit('SHARE', `${q.details.quoteNo} (email)`);
    },
  };
}
