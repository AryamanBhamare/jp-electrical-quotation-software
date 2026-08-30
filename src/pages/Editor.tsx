import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  Mail,
  MoreHorizontal,
  Pencil,
  Printer,
  ReceiptText,
  Redo2,
  Save,
  Share2,
  Undo2,
  Upload,
  User,
} from 'lucide-react';
import QuoteDocument from '@/components/quote/QuoteDocument';
import { EditorForm } from '@/components/editor/EditorForm';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { exportActions } from '@/components/editor/exportActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/store/useStore';
import { useAutosave } from '@/hooks/useAutosave';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { withLiveCompany } from '@/services/builder';
import { cn } from '@/lib/utils';

function PrintPortal({ children }: { children: React.ReactNode }) {
  const el = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const node = document.createElement('div');
    node.id = 'print-root';
    document.body.appendChild(node);
    el.current = node;
    setMounted(true);
    return () => {
      node.remove();
    };
  }, []);
  if (!mounted || !el.current) return null;
  return createPortal(children, el.current);
}

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const current = useStore((s) => s.current);
  const quotations = useStore((s) => s.quotations);
  const templates = useStore((s) => s.templates);
  const company = useStore((s) => s.company);
  const setCurrent = useStore((s) => s.setCurrent);
  const saveQuotation = useStore((s) => s.saveQuotation);
  const addSnapshot = useStore((s) => s.addSnapshot);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const pastLen = useStore((s) => s.past.length);
  const futureLen = useStore((s) => s.future.length);
  const duplicate = useStore((s) => s.duplicateQuotation);
  const convertToInvoice = useStore((s) => s.createInvoiceFromQuotation);
  const setStatus = useStore((s) => s.setStatus);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  useAutosave();

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const actions = exportActions();

  const rawQuote = id && current?.id === id ? current : quotations.find((q) => q.id === id) ?? null;
  const quote = useMemo(() => (rawQuote ? withLiveCompany(rawQuote, company) : null), [rawQuote, company]);

  useEffect(() => {
    if (!rawQuote && id && !current) {
      const found = quotations.find((q) => q.id === id);
      if (found) setCurrent(found);
    }
  }, [id, current, quotations, setCurrent, rawQuote]);

  const baseTemplate = templates.find((t) => t.id === quote?.templateId) ?? templates[0];
  const template = quote
    ? { ...baseTemplate, accent: quote.theme?.accent || baseTemplate.accent, font: quote.theme?.font || baseTemplate.font }
    : baseTemplate;

  const handleSave = () => {
    if (!quote) return;
    saveQuotation(quote);
    addSnapshot(quote, 'Manual save');
    setSaving(true);
    setTimeout(() => setSaving(false), 700);
    toast.success('Quotation saved');
  };

  useHotkeys(
    [
      { combo: 'ctrl+s', handler: (e) => { e.preventDefault(); handleSave(); } },
      { combo: 'ctrl+z', handler: () => undo() },
      { combo: 'ctrl+shift+z', handler: () => redo() },
      { combo: 'ctrl+y', handler: () => redo() },
      { combo: 'ctrl+p', handler: (e) => { e.preventDefault(); if (quote) actions.print(quote); } },
      { combo: 'ctrl+d', handler: (e) => { e.preventDefault(); if (quote) { const nid = duplicate(quote.id); if (nid) navigate(`/editor/${nid}`); } } },
      { combo: 'ctrl+shift+p', handler: (e) => { e.preventDefault(); setView(isDesktop ? 'edit' : 'preview'); } },
    ],
    [quote, isDesktop],
  );

  if (!quote) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <p>Quotation not found.</p>
        <Button onClick={() => navigate('/quotations')}>Back to quotations</Button>
      </div>
    );
  }

  const saveFile = quote.sourcePo ? `${quote.sourcePo.replace(/\.pdf$/i, '')}` : quote.details.quoteNo;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-0">
      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => navigate('/quotations')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{quote.title}</span>
              <Badge variant={quote.status === 'final' ? 'success' : 'warning'}>{quote.status}</Badge>
              {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
            </div>
            <span className="text-[11px] text-muted-foreground">
              v{quote.version} · Updated {new Date(quote.updatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border bg-background/60">
            <Button size="sm" variant="ghost" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <span className="border-x px-1 text-[10px] text-muted-foreground">{pastLen}</span>
            <Button size="sm" variant="ghost" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <span className="border-x px-1 text-[10px] text-muted-foreground">{futureLen}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus(quote.id, quote.status === 'final' ? 'draft' : 'final')}
            title="Toggle status"
          >
            {quote.status === 'final' ? <Pencil className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {quote.status === 'final' ? 'Mark Draft' : 'Mark Final'}
          </Button>

          <Button size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export {quote.details.quoteNo}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void actions.downloadPdf(quote, template)}>
                <FileText className="h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void actions.downloadDocx(quote, template)}>
                <FileText className="h-4 w-4" /> Download Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.print(quote)}>
                <Printer className="h-4 w-4" /> Print
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void actions.copyHtml(quote, docRef.current)}>
                <FileText className="h-4 w-4" /> Copy HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.downloadHtml(quote, docRef.current)}>
                <FileText className="h-4 w-4" /> Save HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.downloadExcel(quote)}>
                <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.downloadCsv(quote)}>
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.downloadJson(quote)}>
                <FileJson className="h-4 w-4" /> JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void actions.share(quote)}>
                <Share2 className="h-4 w-4" /> Copy Share Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void actions.shareWhatsApp(quote)}>
                <Upload className="h-4 w-4" /> WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void actions.shareEmail(quote)}>
                <Mail className="h-4 w-4" /> Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => { const nid = duplicate(quote.id); if (nid) navigate(`/editor/${nid}`); }}>
                Copy / Duplicate quotation
              </DropdownMenuItem>
              {quote.docType !== 'invoice' ? (
                <DropdownMenuItem onClick={() => { const nid = convertToInvoice(quote.id); if (nid) navigate(`/editor/${nid}`); }}>
                  <ReceiptText className="h-4 w-4" /> Convert to Tax Invoice
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => { setCurrent(null); navigate('/upload'); }}>
                <Upload className="h-4 w-4" /> Import another PO
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="h-4 w-4" /> Company settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* body */}
      {isDesktop ? (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          <div className="scrollbar-thin min-h-0 overflow-y-auto rounded-xl pb-4">
            <EditorForm quote={quote} />
          </div>
          <div className="min-h-0 overflow-hidden rounded-xl border bg-background/40">
            <PreviewPane quote={quote} template={template} onPrint={() => actions.print(quote)} />
          </div>
        </div>
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as 'edit' | 'preview')} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-10">
            <EditorForm quote={quote} />
          </TabsContent>
          <TabsContent value="preview" className="h-[calc(100vh-10rem)] min-h-0 overflow-hidden rounded-xl border bg-background/40">
            <PreviewPane quote={quote} template={template} onPrint={() => actions.print(quote)} />
          </TabsContent>
        </Tabs>
      )}

      {/* print portal renders the A4 document only */}
      <PrintPortal>
        <div className={cn('print-root-inner')}>
          <QuoteDocument quote={quote} template={template} ref={docRef} />
        </div>
      </PrintPortal>
    </div>
  );
}
