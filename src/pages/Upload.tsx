import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Rows3,
  Search,
  Wallet,
} from 'lucide-react';
import type { ParseProgress } from '@/services/parser';
import { parsePdfFile } from '@/services/parser';
import { buildQuotationFromPo, nextQuoteNumber } from '@/services/builder';
import { useStore } from '@/store/useStore';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Stage = 'idle' | 'parsing' | 'review';

export default function Upload() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [outcome, setOutcome] = useState<Awaited<ReturnType<typeof parsePdfFile>> | null>(null);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  const company = useStore((s) => s.company);
  const settings = useStore((s) => s.settings);
  const setCurrent = useStore((s) => s.setCurrent);
  const logAudit = useStore((s) => s.logAudit);

  const runParse = useCallback(
    async (file: File, forceOcr = false) => {
      setFileName(file.name);
      fileRef.current = file;
      setStage('parsing');
      setProgress({ stage: 'reading', page: 0, total: 1, message: 'Reading PDF…' });
      try {
        const res = await parsePdfFile(file, setProgress, { forceOcr });
        setOutcome(res);
        setStage('review');
        logAudit('PARSE_PO', `${file.name} (${res.method})`);
        if (res.method === 'ocr') toast.info('Scanned PDF detected — OCR completed');
        if (res.result.warnings.length > 0) {
          toast.warning('Some fields could not be detected.');
        }
      } catch (err) {
        toast.error(`Could not parse PDF: ${(err as Error).message}`);
        setStage('idle');
      }
    },
    [logAudit],
  );

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }
    void runParse(file);
  }, [runParse]);

  const createQuotation = () => {
    if (!outcome) return;
    const seq = settings.quoteSeq + 1;
    const quoteNo = nextQuoteNumber(settings.quotePrefix, settings.quoteYear, seq);
    const q = buildQuotationFromPo(outcome.result.po, company, settings, quoteNo);
    q.sourcePo = outcome.fileName;
    setCurrent(q);
    useStore.getState().updateSettings({ quoteSeq: seq });
    toast.success('Quotation created — review & export');
    navigate(`/editor/${q.id}`);
  };

  const forceOcr = () => {
    if (!fileRef.current) return;
    void runParse(fileRef.current, true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Purchase Order <span className="text-gradient">→ Quotation</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Upload a PDF. Every field is auto-extracted into an editable quotation — nothing is ever lost.
          Scanned PDFs are handled automatically with built-in OCR.
        </p>
      </div>

      {stage === 'idle' || stage === 'parsing' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'glass flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all',
            dragOver ? 'scale-[1.01] border-primary bg-primary/5' : 'border-border',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-xl shadow-primary/30">
              {stage === 'parsing' ? <Loader2 className="h-9 w-9 animate-spin" /> : <FileUp className="h-9 w-9" />}
            </div>
          </motion.div>

          {stage === 'idle' ? (
            <>
              <div>
                <p className="text-lg font-semibold">Drag &amp; drop your Purchase Order PDF</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse · scanned PDFs supported via OCR</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" /> PO Number</Badge>
                <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> Customer &amp; GST</Badge>
                <Badge variant="outline" className="gap-1"><Rows3 className="h-3 w-3" /> Items table</Badge>
                <Badge variant="outline" className="gap-1"><Wallet className="h-3 w-3" /> Totals &amp; taxes</Badge>
                <Badge variant="outline" className="gap-1"><Search className="h-3 w-3" /> Terms</Badge>
              </div>
            </>
          ) : (
            <div className="w-full max-w-md space-y-3 text-left">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <Progress value={progress && progress.total ? progress.page / progress.total : undefined} indeterminate={!progress || progress.total === 0} />
              <p className="text-xs text-muted-foreground">{progress?.message ?? 'Reading…'}</p>
            </div>
          )}
        </div>
      ) : null}

      {stage === 'review' && outcome ? (
        <ReviewPanel outcome={outcome} onCreate={createQuotation} onRetry={() => setStage('idle')} onForceOcr={forceOcr} />
      ) : null}
    </div>
  );
}

function ReviewPanel({
  outcome,
  onCreate,
  onRetry,
  onForceOcr,
}: {
  outcome: Awaited<ReturnType<typeof parsePdfFile>>;
  onCreate: () => void;
  onRetry: () => void;
  onForceOcr: () => void;
}) {
  const po = outcome.result.po;
  const fields = [
    { label: 'Customer', value: po.customerName, icon: Building2 },
    { label: 'PO Number', value: po.poNumber, icon: FileText },
    { label: 'PO Date', value: po.poDate, icon: FileText },
    { label: 'GSTIN', value: po.gstin, icon: Search },
    { label: 'PAN', value: po.pan, icon: Search },
    { label: 'Email', value: po.email, icon: Mail },
    { label: 'Phone', value: po.phone, icon: Phone },
    { label: 'Address', value: po.address, icon: Building2 },
    { label: 'Payment Terms', value: po.paymentTerms, icon: FileText },
    { label: 'Grand Total', value: po.grandTotal != null ? `₹ ${po.grandTotal}` : undefined, icon: Wallet },
  ].filter((f) => f.value);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Extracted from {outcome.fileName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={outcome.method === 'ocr' ? 'warning' : 'success'}>
              {outcome.method === 'ocr' ? 'OCR used' : 'Text layer'}
            </Badge>
            <Badge variant="outline">Confidence {outcome.result.confidence}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          {outcome.result.warnings.length ? (
            <div className="mb-4 space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              {outcome.result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="flex items-start gap-2.5 rounded-lg border bg-background/50 px-3 py-2">
                <f.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
                  <div className="truncate text-sm font-medium">{f.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              Items detected: {po.items.length}
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 text-left">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">HSN</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">No items detected</td>
                    </tr>
                  ) : (
                    po.items.slice(0, 40).map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{it.description || '—'}</td>
                        <td className="p-2">{it.hsnCode || ''}</td>
                        <td className="p-2 text-right">{it.quantity ?? ''}</td>
                        <td className="p-2 text-right">{it.rate ?? ''}</td>
                        <td className="p-2 text-right">{it.amount ?? ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {po.items.length > 40 ? <p className="mt-1 text-[11px] text-muted-foreground">+{po.items.length - 40} more items — all included in the quotation.</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Choose another file
          </Button>
          <Button variant="ghost" onClick={onForceOcr} className="text-muted-foreground">
            Re-run OCR
          </Button>
        </div>
        <Button size="lg" onClick={onCreate} className="gap-2">
          Open in Quotation Editor <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Everything is editable in the editor — adjust any field, then export PDF / Word instantly.
      </p>
    </motion.div>
  );
}
