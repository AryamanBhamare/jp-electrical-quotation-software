import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FileDown, Printer } from 'lucide-react';
import { decodeDataURL, readShareCodeFromHash } from '@/lib/codec';
import { useStore } from '@/store/useStore';
import type { Quotation } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import QuoteDocument from '@/components/quote/QuoteDocument';
import { exportActions } from '@/components/editor/exportActions';

export default function Share() {
  const { code } = useParams<{ code: string }>();
  const quotations = useStore((s) => s.quotations);
  const templates = useStore((s) => s.templates);
  const docRef = useRef<HTMLDivElement>(null);

  const [embedded, setEmbedded] = useState<Quotation | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const c = code ?? readShareCodeFromHash();
    (async () => {
      if (!c) {
        if (!cancelled) setPending(false);
        return;
      }
      if (c.startsWith('data:')) {
        try {
          const raw = c.slice('data:'.length);
          const parsed = (await decodeDataURL(raw)) as Quotation;
          if (!cancelled) setEmbedded(parsed);
        } catch {
          if (!cancelled) setEmbedded(null);
        }
      }
      if (!cancelled) setPending(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const codeStr = code ?? readShareCodeFromHash() ?? '';

  const data: Quotation | null =
    embedded ?? quotations.find((q) => q.id === codeStr || q.details.quoteNo === codeStr) ?? null;

  const template = useMemo(() => {
    if (!data) return templates.find((t) => t.isDefault) ?? templates[0] ?? null;
    return templates.find((t) => t.id === data.templateId) ?? templates.find((t) => t.isDefault) ?? templates[0] ?? null;
  }, [data, templates]);

  if (pending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading quotation…</p>
      </div>
    );
  }

  if (!data || !template) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold">Quotation not found</p>
        <p className="text-sm text-muted-foreground">This link may have expired, or the quotation was deleted.</p>
        <Button asChild variant="outline"><a href="#/">Go to dashboard</a></Button>
      </div>
    );
  }

  const canExport = Boolean(quotations.find((q) => q.id === data.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{data.details.quoteNo}</h1>
          <span className="text-sm text-muted-foreground">Shared quotation</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          {canExport ? (
            <Button size="sm" onClick={() => exportActions().downloadPdf(data, template)}>
              <FileDown className="h-3.5 w-3.5" /> Download PDF
            </Button>
          ) : null}
        </div>
      </div>
      <Card className="glass">
        <CardContent className="flex justify-center p-4 sm:p-6">
          <QuoteDocument ref={docRef} quote={data} template={template} />
        </CardContent>
      </Card>
    </div>
  );
}
