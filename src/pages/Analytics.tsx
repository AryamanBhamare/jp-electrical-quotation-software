import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, TrendingUp, Upload } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { analyticsToCsv, auditToCsv, downloadText } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Analytics() {
  const analytics = useStore((s) => s.analytics);
  const audit = useStore((s) => s.audit);
  const quotations = useStore((s) => s.quotations);
  const customers = useStore((s) => s.customers);

  const days = useMemo(() => {
    const out: Array<{ date: string; label: string; created: number; exported: number }> = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const v = analytics[key] ?? { created: 0, exported: 0 };
      out.push({ date: key, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), created: v.created, exported: v.exported });
    }
    return out;
  }, [analytics]);

  const totals = useMemo(() => {
    let created = 0;
    let exported = 0;
    Object.values(analytics).forEach((v) => {
      created += v.created;
      exported += v.exported;
    });
    return { created, exported };
  }, [analytics]);

  const maxVal = Math.max(1, ...days.map((d) => Math.max(d.created, d.exported)));

  const statCards = [
    { label: 'Quotes Created', value: totals.created, icon: FileText, tint: 'from-sky-500 to-blue-600' },
    { label: 'Quotes Exported', value: totals.exported, icon: Upload, tint: 'from-emerald-500 to-teal-600' },
    { label: 'Saved Quotations', value: quotations.length, icon: TrendingUp, tint: 'from-violet-500 to-purple-600' },
    { label: 'Customers', value: customers.length, icon: TrendingUp, tint: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your quoting activity &amp; audit trail</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadText(analyticsToCsv(days.map((d) => ({ id: d.date, date: d.date, quotesCreated: d.created, quotesExported: d.exported }))), 'analytics.csv', 'text/csv')}>
            <Download className="h-3.5 w-3.5" /> Analytics CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadText(auditToCsv(audit), 'audit-log.csv', 'text/csv')}>
            <Download className="h-3.5 w-3.5" /> Audit CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.tint} text-white shadow`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass">
        <CardHeader className="p-5">
          <CardTitle className="text-base">Last 14 days — created vs exported</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="flex h-44 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                  <div className="w-1/2 rounded-t bg-sky-500/80 transition-all group-hover:bg-sky-500" style={{ height: `${(d.created / maxVal) * 100}%`, minHeight: d.created ? 4 : 0 }} title={`Created: ${d.created}`} />
                  <div className="w-1/2 rounded-t bg-emerald-500/80 transition-all group-hover:bg-emerald-500" style={{ height: `${(d.exported / maxVal) * 100}%`, minHeight: d.exported ? 4 : 0 }} title={`Exported: ${d.exported}`} />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> Created</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Exported</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="p-5">
          <CardTitle className="text-base">Audit log</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto p-0">
          {audit.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 text-left">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.slice(0, 100).map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{new Date(a.at).toLocaleString()}</td>
                    <td className="p-3">
                      <Badge variant={a.action.startsWith('DELETE') ? 'destructive' : 'secondary'}>{a.action}</Badge>
                    </td>
                    <td className="p-3">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
