import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, FileText, FileUp, Plus, TrendingUp, Users, Wallet, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { isInvoice } from '@shared/types';
import { computeTotals } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

export default function Dashboard() {
  const allDocuments = useStore((s) => s.quotations);
  const quotations = useMemo(() => allDocuments.filter((q) => !isInvoice(q)), [allDocuments]);
  const customers = useStore((s) => s.customers);
  const analytics = useStore((s) => s.analytics);
  const settings = useStore((s) => s.settings);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totalValue = quotations.reduce((sum, q) => {
      const t = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
      return sum + t.rounded;
    }, 0);
    const thisMonth = Object.entries(analytics)
      .filter(([d]) => d.startsWith(new Date().toISOString().slice(0, 7)))
      .reduce((s, [, v]) => s + v.created, 0);
    const sym = settings.currency.symbol;
    return { totalValue, sym, thisMonth };
  }, [quotations, analytics, settings.currency.symbol]);

  const recent = [...quotations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const todayKey = new Date().toISOString().slice(0, 10);

  const quickStats = [
    { label: 'Total Quotations', value: String(quotations.length), icon: FileText, tint: 'from-sky-500 to-blue-600' },
    { label: 'Total Value', value: `${stats.sym}${Math.round(stats.totalValue).toLocaleString('en-IN')}`, icon: Wallet, tint: 'from-emerald-500 to-teal-600' },
    { label: 'Customers', value: String(customers.length), icon: Users, tint: 'from-violet-500 to-purple-600' },
    { label: 'Created This Month', value: String(stats.thisMonth), icon: TrendingUp, tint: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* hero */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass gradient-hero relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Convert Purchase Orders to <span className="text-gradient">beautiful quotations</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Upload a PO PDF — every field is extracted automatically into an editable quotation.
              Review, adjust, and export a professional PDF or Word document in seconds.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button size="lg" className="gap-2" onClick={() => navigate('/upload')}>
                <FileUp className="h-4 w-4" /> Upload Purchase Order
              </Button>
              <Button size="lg" variant="outline" className="gap-2" onClick={() => { const id = useStore.getState().createBlank(); navigate(`/editor/${id}`); }}>
                <Plus className="h-4 w-4" /> Blank Quotation
              </Button>
            </div>
          </div>
          <div className="hidden items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Auto-generated today</div>
              <div className="text-lg font-bold">
                {settings.quotePrefix}-{settings.quoteYear}-{String((settings.quoteSeq + 1)).padStart(4, '0')}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {quickStats.map((s, i) => (
          <motion.div key={s.label} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.06 }}>
            <Card className="glass">
              <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.tint} text-white shadow`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold leading-tight">{s.value}</div>
                  <div className="truncate text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* recent quotations */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
        <Card className="glass">
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5">
            <CardTitle className="text-base">Recent Quotations</CardTitle>
            <Link to="/quotations" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <FileText className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium">No quotations yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Upload a Purchase Order to auto-generate your first quotation, or start with a blank one.
                </p>
                <Button onClick={() => navigate('/upload')} className="mt-2 gap-2">
                  <FileUp className="h-4 w-4" /> Upload a PO
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {recent.map((q) => {
                  const t = computeTotals(q.items, q.gst, q.discount, q.roundOff, q.details.currency);
                  return (
                    <li key={q.id}>
                      <Link to={`/editor/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">{q.details.quoteNo}</span>
                            <Badge variant={q.status === 'final' ? 'success' : 'warning'} className="capitalize">{q.status}</Badge>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {q.customer.company || q.customer.name || '—'}
                            {q.details.poNumber ? ` · PO: ${q.details.poNumber}` : ''}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold">{formatMoney(t.rounded, stats.sym)}</div>
                          <div className="text-[11px] text-muted-foreground">{formatDate(q.details.quoteDate)}</div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
