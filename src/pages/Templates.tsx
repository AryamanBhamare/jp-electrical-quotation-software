import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Copy, LayoutTemplate, Pencil, Star, Trash2 } from 'lucide-react';
import type { QuoteTemplate } from '@shared/types';
import { PRESET_ACCENTS } from '@shared/types';
import { uid } from '@/lib/id';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function TemplateEditor({
  template,
  onChange,
  onClose,
}: {
  template: QuoteTemplate;
  onChange: (t: QuoteTemplate) => void;
  onClose: () => void;
}) {
  const set = (p: Partial<QuoteTemplate>) => onChange({ ...template, ...p });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Template name</Label>
          <Input value={template.name} onChange={(e) => set({ name: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Font</Label>
            <Select value={template.font} onValueChange={(v) => set({ font: v as 'sans' | 'serif' })}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sans" className="text-xs">Sans-serif</SelectItem>
                <SelectItem value="serif" className="text-xs">Serif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Header align</Label>
            <Select value={template.headerAlign} onValueChange={(v) => set({ headerAlign: v as 'left' | 'center' })}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left" className="text-xs">Left</SelectItem>
                <SelectItem value="center" className="text-xs">Centered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Accent color</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => set({ accent: c })}
                className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: template.accent === c ? '#0f172a' : 'transparent' }}
                aria-label={c}
              />
            ))}
            <input type="color" value={template.accent} onChange={(e) => set({ accent: e.target.value })} className="h-8 w-8 cursor-pointer rounded border" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Logo size (px)</Label>
            <Input type="number" min={40} max={200} value={template.logoSize} onChange={(e) => set({ logoSize: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Body font size</Label>
            <Input type="number" min={10} max={18} value={template.bodyFontSize} onChange={(e) => set({ bodyFontSize: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Page margin (px)</Label>
            <Input type="number" min={16} max={60} value={template.pageMargin} onChange={(e) => set({ pageMargin: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Table header background</Label>
            <input type="color" value={template.tableHeaderBg} onChange={(e) => set({ tableHeaderBg: e.target.value })} className="h-9 w-full cursor-pointer rounded border" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Watermark opacity</Label>
            <Input type="number" min={0} max={100} step={1} value={Math.round(template.watermarkOpacity * 100)} onChange={(e) => set({ watermarkOpacity: (Number(e.target.value) || 0) / 100 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Signature size (px)</Label>
            <Input type="number" min={60} max={240} value={template.signatureSize} onChange={(e) => set({ signatureSize: Number(e.target.value) })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ToggleRow label="Header border" checked={template.showHeaderBorder} onChange={(v) => set({ showHeaderBorder: v })} />
          <ToggleRow label="Footer line" checked={template.showFooterLine} onChange={(v) => set({ showFooterLine: v })} />
        </div>
      </div>

      {/* live preview of styling on a sample */}
      <TemplateMiniPreview template={template} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TemplateMiniPreview({ template }: { template: QuoteTemplate }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Live preview</Label>
      <div className="scrollbar-thin max-h-[560px] overflow-auto rounded-xl border bg-slate-100 p-4 dark:bg-slate-950/40">
        <div className="mx-auto w-[220mm] max-w-full bg-white p-6 text-[12px] shadow" style={{ color: '#111827', fontFamily: template.font === 'serif' ? 'Georgia, serif' : 'Inter, sans-serif' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-extrabold" style={{ color: '#0f172a' }}>JP Electricals</div>
              <div className="mt-1 text-[10px] text-slate-600">Demo Address, Electrical Market</div>
              <div className="text-[10px] text-slate-600">GSTIN: 27XXXXX0000X1Z5</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: template.accent }}>QUOTATION</div>
              <div className="text-[10px]">JPE-2026-0001</div>
            </div>
          </div>
          {template.showHeaderBorder ? <div className="mt-3 h-[2px]" style={{ background: template.accent }} /> : <div className="mt-3 h-px bg-slate-200" />}
          <table className="mt-4 w-full border-collapse text-[10px]">
            <thead>
              <tr>
                {['#', 'Description', 'HSN', 'Qty', 'Rate', 'Amount'].map((h) => (
                  <th key={h} className="border border-slate-300 px-1.5 py-1 text-left font-semibold" style={{ background: template.tableHeaderBg }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['HT Panel 63A', 'Busbar 32x5mm', 'Lugs & Accessories'].map((d, i) => (
                <tr key={d}>
                  <td className="border border-slate-300 px-1.5 py-1">{i + 1}</td>
                  <td className="border border-slate-300 px-1.5 py-1">{d}</td>
                  <td className="border border-slate-300 px-1.5 py-1">8537</td>
                  <td className="border border-slate-300 px-1.5 py-1 text-right">2</td>
                  <td className="border border-slate-300 px-1.5 py-1 text-right">12,500</td>
                  <td className="border border-slate-300 px-1.5 py-1 text-right">25,000</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end">
            <div className="w-48 border border-slate-300 text-[10px]">
              <div className="flex justify-between border-b px-2 py-1"><span>Sub Total</span><span>45,000</span></div>
              <div className="flex justify-between border-b px-2 py-1 font-bold" style={{ background: template.tableHeaderBg }}><span>Grand Total</span><span>53,100</span></div>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div className="text-[9px] text-slate-500">Terms &amp; Conditions apply</div>
            <div className="text-right text-[10px]">
              <div className="font-semibold">For, JP Electricals</div>
              <div className="mt-1">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Templates() {
  const templates = useStore((s) => s.templates);
  const addTemplate = useStore((s) => s.addTemplate);
  const updateTemplate = useStore((s) => s.updateTemplate);
  const deleteTemplate = useStore((s) => s.deleteTemplate);
  const setDefault = useStore((s) => s.setDefaultTemplate);
  const [editing, setEditing] = useState<QuoteTemplate | null>(null);

  const duplicateTemplate = (t: QuoteTemplate) => {
    const copy: QuoteTemplate = { ...t, id: uid('tpl'), name: `${t.name} (Copy)`, isDefault: false, isSystem: false };
    addTemplate(copy);
    toast.success('Template duplicated');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">Design how your quotations look — fonts, colors, spacing &amp; branding</p>
        </div>
        <Button
          onClick={() => {
            const t: QuoteTemplate = {
              id: uid('tpl'),
              name: 'New Template',
              isDefault: false,
              accent: '#0ea5e9',
              font: 'sans',
              headerAlign: 'left',
              showHeaderBorder: true,
              showFooterLine: true,
              logoSize: 90,
              signatureSize: 120,
              stampSize: 110,
              watermarkOpacity: 0.06,
              pageMargin: 28,
              bodyFontSize: 13,
              tableHeaderBg: '#e0f2fe',
            };
            addTemplate(t);
            setEditing(t);
          }}
          className="gap-1.5"
        >
          <LayoutTemplate className="h-4 w-4" /> New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="glass h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                    <span className="font-semibold">{t.name}</span>
                    {t.isDefault ? <Badge variant="success">Default ★</Badge> : null}
                  </div>
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(t)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateTemplate(t)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {!t.isSystem ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => { deleteTemplate(t.id); toast.success('Template deleted'); }} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Font: {t.font === 'serif' ? 'Serif' : 'Sans-serif'} · Header: {t.headerAlign}</p>
                  <p>Accent: <span className="font-mono">{t.accent}</span> · Margin: {t.pageMargin}px</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  disabled={t.isDefault}
                  onClick={() => { setDefault(t.id); toast.success(`${t.name} set as default`); }}
                >
                  <Star className="h-3.5 w-3.5" /> {t.isDefault ? 'Default template' : 'Set as default'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit template</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TemplateEditor
              template={editing}
              onChange={(t) => {
                updateTemplate(t);
                setEditing(t);
              }}
              onClose={() => setEditing(null)}
            />
          ) : null}
          <DialogFooter>
            <Button onClick={() => { updateTemplate(editing as QuoteTemplate); setEditing(null); toast.success('Template saved'); }}>Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
