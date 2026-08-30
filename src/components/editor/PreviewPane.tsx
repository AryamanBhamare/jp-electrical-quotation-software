import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import type { Quotation, QuoteTemplate } from '@shared/types';
import QuoteDocument from '@/components/quote/QuoteDocument';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  quote: Quotation;
  template: QuoteTemplate;
  onPrint?: () => void;
}

export function PreviewPane({ quote, template, onPrint }: Props) {
  const [zoom, setZoom] = useState(0.9);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = (el.clientWidth - 48) / 794;
    setZoom(Math.min(1, Math.max(0.4, fit)));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between rounded-lg border bg-background/70 px-2 py-1.5 backdrop-blur">
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} aria-label="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} aria-label="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              const el = containerRef.current;
              if (el) setZoom(Math.min(1, Math.max(0.4, (el.clientWidth - 48) / 794)));
            }}
            aria-label="Fit width"
            title="Fit width"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
      </div>

      <div ref={containerRef} className="scrollbar-thin flex-1 overflow-auto rounded-xl bg-slate-200/60 p-4 dark:bg-neutral-950/40">
        <div
          className="mx-auto origin-top"
          style={{
            width: 210 * zoom * 3.779, // 210mm in px at 96dpi
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          <div className="quote-sheet rounded-sm">
            <QuoteDocument quote={quote} template={template} ref={docRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
