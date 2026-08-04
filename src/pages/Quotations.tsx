import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckSquare,
  Copy,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Pencil,
  Plus,
  Search,
  Share2,
  Square,
  Trash2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { computeTotals } from '@/lib/calculations';
import { formatMoney, formatDate } from '@/lib/format';
import { quotationsToCsv, downloadText } from '@/lib/csv';
import { exportQuotationsExcel } from '@/services/exportExcel';
import { buildPdf } from '@/services/exportPdf';
import { downloadBlob } from '@/lib/csv';
import { encodeDataURL, buildShareUrl } from '@/lib/codec';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusFilter = 'all' | 'draft' | 'final';

export default function Quotations() {
  const quotations = useStore((s) => s.quotations);
  const templates = useStore((s) => s.templates);
  const customers = useStore((s) => s.customers);
  const duplicate = useStore((s) => s.duplicateQuotation);
  const remove = useStore((s) => s.deleteQuotation);
  const rename = useStore((s) => s.renameQuotation);
  const logAudit = useStore((s) => s.logAudit);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...quotations]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((x) => (status === 'all' ? true : x.status === status))
      .filter(
        (x) =>
          !q ||
          x.details.quoteNo.toLowerCase().includes(q) ||
          x.details.poNumber.toLowerCase().includes(q) ||
          x.title.toLowerCase().includes(q) ||
          x.customer.name.toLowerCase().includes(q) ||
          x.customer.company.toLowerCase().includes(q) ||
          x.items.some((it) => it.description.toLowerCase().includes(q)),
      );
  }, [quotations, status, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((f) => f.id))));
  };

  const exportListCsv = () => {
    downloadText(quotationsToCsv(filtered), 'quotations.csv', 'text/csv');
    logAudit('EXPORT_CSV', `${filtered.length} quotations`);
  };

  const exportListExcel = () => {
    exportQuotationsExcel(filtered);
    logAudit('EXPORT_EXCEL', `${filtered.length} quotations`);
  };

  const bulkPdf = async () => {
    const targets = quotations.filter((q) => selected.has(q.id));
    if (!targets.length) return;
    toast.info(`Exporting ${targets.length} PDF(s)…`);
    for (const q of targets) {
      const t = templates.find((x) => x.id === q.templateId) ?? templates[0];
      const blob = await buildPdf(q, t);
      downloadBlob(blob, `${q.details.quoteNo}.pdf`);
      await new Promise((r) => setTimeout(r, 600));
    }
    logAudit('EXPORT_PDF', `${targets.length} quotations (bulk)`);
    toast.success('Bulk PDF export done');
  };

  const shareOne = async (id: string) => {
    const q = quotations.find((x) => x.id === id);
    if (!q) return;
    const code = await encodeDataURL(q);
    await navigator.clipboard.writeText(buildShareUrl(code));
    toast.success('Shareable link copied');
  };

  const duplicateAndGo = (id: string) => {
    const nid = duplicate(id);
    if (nid) navigate(`/editor/${nid}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">{quotations.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={bulkPdf}>
                <FileDown className="h-3.5 w-3.5" /> Bulk PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="outline" onClick={exportListCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportListExcel}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button size="sm" onClick={() => { const id = useStore.getState().createBlank(); navigate(`/editor/${id}`); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search quote no, PO no, customer, item…" className="pl-8" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="draft" className="text-xs">Drafts</SelectItem>
              <SelectItem value="final" className="text-xs">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">No quotations match</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {quotations.length === 0 ? 'Upload a Purchase Order to get started.' : 'Try a different search or filter.'}
            </p>
            {quotations.length === 0 ? (
              <Button onClick={() => navigate('/upload')} className="mt-1">Upload a PO</Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-10 p-3 text-center">
                      <button onClick={toggleAll} aria-label="Select all" className="text-muted-foreground hover:text-foreground">
                        {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    <th className="p-3">Quotation No</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">PO No</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => {
                    const t = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
                    return (
                      <motion.tr
                        key={q.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="cursor-pointer border-t transition-colors hover:bg-accent/40"
                        onClick={() => navigate(`/editor/${q.id}`)}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggle(q.id)} aria-label="Select" className="text-muted-foreground hover:text-foreground">
                            {selected.has(q.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="p-3 font-semibold">{q.details.quoteNo}</td>
                        <td className="max-w-[180px] truncate p-3">
                          <div className="truncate font-medium">{q.customer.company || q.customer.name || '—'}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{q.customer.gstin}</div>
                        </td>
                        <td className="p-3 text-muted-foreground">{q.details.poNumber || '—'}</td>
                        <td className="p-3 text-right font-semibold">{formatMoney(t.rounded)}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(q.details.quoteDate)}</td>
                        <td className="p-3">
                          <Badge variant={q.status === 'final' ? 'success' : 'warning'} className="capitalize">{q.status}</Badge>
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/editor/${q.id}`)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="More">
                                  <FileDown className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => duplicateAndGo(q.id)}>
                                  <Copy className="h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRenameTarget({ id: q.id, title: q.title })}>
                                  <Pencil className="h-4 w-4" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void shareOne(q.id)}>
                                  <Share2 className="h-4 w-4" /> Copy share link
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteId(q.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete quotation?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) remove(deleteId);
                setDeleteId(null);
                toast.success('Quotation deleted');
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameTarget != null} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename quotation</DialogTitle>
          </DialogHeader>
          <Input
            value={renameTarget?.title ?? ''}
            onChange={(e) => setRenameTarget((r) => (r ? { ...r, title: e.target.value } : r))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameTarget) {
                rename(renameTarget.id, renameTarget.title);
                setRenameTarget(null);
                toast.success('Renamed');
              }
            }}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (renameTarget) {
                  rename(renameTarget.id, renameTarget.title);
                  setRenameTarget(null);
                  toast.success('Renamed');
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
