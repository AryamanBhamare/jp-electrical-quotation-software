import { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Save, UserPlus } from 'lucide-react';
import type { QuoteItem, Quotation } from '@shared/types';
import { CURRENCIES, INDIAN_STATES } from '@shared/types';
import { useStore } from '@/store/useStore';
import { TextField, TextAreaField, NumberField, Field } from './Field';
import { ItemTable } from './ItemTable';
import { SectionCard } from './SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PRESET_ACCENTS } from '@shared/types';
import { emptyCustomer } from '@shared/types';
import { uid } from '@/lib/id';

export function EditorForm({ quote }: { quote: Quotation }) {
  const patch = useStore((s) => s.patchCurrent);
  const templates = useStore((s) => s.templates);
  const customers = useStore((s) => s.customers);
  const company = useStore((s) => s.company);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const setCurrent = useStore((s) => s.setCurrent);

  const setCustomer = (p: Partial<Quotation['customer']>) => {
    patch((d) => {
      d.customer = { ...d.customer, ...p };
    });
  };
  const setDetails = (p: Partial<Quotation['details']>) => {
    patch((d) => {
      d.details = { ...d.details, ...p };
    });
  };
  const setItems = (items: QuoteItem[]) => patch((d) => void (d.items = items));
  const setGst = (p: Partial<Quotation['gst']>) => patch((d) => void Object.assign(d.gst, p));
  const setDiscount = (p: Partial<Quotation['discount']>) => patch((d) => void Object.assign(d.discount, p));
  const setCompany = (p: Partial<Quotation['company']>) => patch((d) => void (d.company = { ...d.company, ...p }));
  const setTheme = (p: Partial<Quotation['theme']>) => patch((d) => void Object.assign(d.theme, p));
  const toggle = (k: 'showLogo' | 'showStamp' | 'showSignature' | 'showQr') => patch((d) => void (d[k] = !d[k]));

  const saveCustomer = () => {
    const existing = customers.find((c) => c.id === quote.customer.id);
    if (existing) updateCustomer(quote.customer);
    else addCustomer(quote.customer);
    toast.success('Customer saved');
  };

  const template = templates.find((t) => t.id === quote.templateId) ?? templates[0];

  return (
    <div className="space-y-4">
      {/* ── Company ── */}
      <SectionCard
        title="Company Details"
        action={
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              patch((d) => void (d.company = JSON.parse(JSON.stringify(company))));
              toast.success('Loaded company profile from Settings');
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Use profile
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Prefix (M/S.)" value={quote.company.titlePrefix} onChange={(v) => setCompany({ titlePrefix: v })} />
          <TextField label="Company Name" value={quote.company.name} onChange={(v) => setCompany({ name: v })} />
          <TextField label="Business Description" value={quote.company.businessDesc} onChange={(v) => setCompany({ businessDesc: v })} />
          <TextField label="Contact Person" value={quote.company.contactPerson} onChange={(v) => setCompany({ contactPerson: v })} />
          <TextField label="Phone" value={quote.company.phone} onChange={(v) => setCompany({ phone: v })} />
          <TextField label="Email" value={quote.company.email} onChange={(v) => setCompany({ email: v })} />
          <TextField label="GSTIN" value={quote.company.gstin} onChange={(v) => setCompany({ gstin: v })} />
          <TextField label="PAN" value={quote.company.pan} onChange={(v) => setCompany({ pan: v })} />
          <TextField label="Website" value={quote.company.website} onChange={(v) => setCompany({ website: v })} />
          <TextAreaField label="Address" className="sm:col-span-2" value={quote.company.address} onChange={(v) => setCompany({ address: v })} rows={2} />
        </div>
      </SectionCard>

      {/* ── Customer ── */}
      <SectionCard
        title="Customer Details"
        action={
          <Button size="sm" variant="outline" className="text-muted-foreground" onClick={saveCustomer}>
            <Save className="h-3.5 w-3.5" /> Save customer
          </Button>
        }
      >
        <Field label="Select previous customer">
          <Select
            value={quote.customer.id}
            onValueChange={(id) => {
              const c = customers.find((x) => x.id === id);
              if (c) setCustomer({ ...JSON.parse(JSON.stringify(c)) });
            }}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Pick a saved customer…" />
            </SelectTrigger>
            <SelectContent>
              {customers.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">No saved customers</div> : null}
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {(c.company || c.name) + (c.gstin ? ` · ${c.gstin}` : '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Attention (To)" value={quote.customer.attention} onChange={(v) => setCustomer({ attention: v })} placeholder="PURCHASE MANAGER" />
          <TextField label="Company" value={quote.customer.company} onChange={(v) => setCustomer({ company: v })} />
          <TextField label="Contact Person" value={quote.customer.name} onChange={(v) => setCustomer({ name: v })} />
          <TextField label="GSTIN" value={quote.customer.gstin} onChange={(v) => setCustomer({ gstin: v })} />
          <TextField label="PAN" value={quote.customer.pan} onChange={(v) => setCustomer({ pan: v })} />
          <TextField label="Phone" value={quote.customer.phone} onChange={(v) => setCustomer({ phone: v })} />
          <TextField label="Email" value={quote.customer.email} onChange={(v) => setCustomer({ email: v })} />
          <TextAreaField label="Address" className="sm:col-span-2" value={quote.customer.address} onChange={(v) => setCustomer({ address: v })} rows={2} />
          <TextField label="City" value={quote.customer.city} onChange={(v) => setCustomer({ city: v })} />
          <Field label="State">
            <Input
              list="states-list"
              className="h-9 text-sm"
              value={quote.customer.state}
              onChange={(e) => setCustomer({ state: e.target.value })}
              placeholder="Select state…"
            />
            <datalist id="states-list">
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <TextField label="Pincode" value={quote.customer.pincode} onChange={(v) => setCustomer({ pincode: v })} />
          <Button size="sm" variant="ghost" className="self-end justify-start text-primary sm:col-span-2" onClick={saveCustomer}>
            <UserPlus className="h-3.5 w-3.5" /> Add to saved customers
          </Button>
        </div>
      </SectionCard>

      {/* ── Quotation Details ── */}
      <SectionCard title="Quotation Details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Quotation No." value={quote.details.quoteNo} onChange={(v) => setDetails({ quoteNo: v })} />
          <TextField label="Quotation Date" type="date" value={quote.details.quoteDate} onChange={(v) => setDetails({ quoteDate: v })} />
          <TextField label="Reference" value={quote.details.reference} onChange={(v) => setDetails({ reference: v })} placeholder="PO / reference number" />
          <TextField label="PO Number" value={quote.details.poNumber} onChange={(v) => setDetails({ poNumber: v })} />
          <TextField label="PO Date" type="date" value={quote.details.poDate} onChange={(v) => setDetails({ poDate: v })} />
          <Field label="Currency">
            <Select value={quote.details.currency} onValueChange={(v) => setDetails({ currency: v })}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-xs">
                    {c.symbol} {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <TextAreaField label="Subject" className="sm:col-span-2" value={quote.details.subject} onChange={(v) => setDetails({ subject: v })} rows={2} />
          <TextAreaField label="Opening Paragraph (Dear Sir, …)" className="sm:col-span-2" value={quote.introduction} onChange={(v) => patch((d) => void (d.introduction = v))} rows={3} placeholder="Dear Sir,&#10;&#10;With reference to the above subject, we are pleased to submit our quotation as follows." />
        </div>
      </SectionCard>

      {/* ── Items ── */}
      <SectionCard title={`Items (${quote.items.length})`}>
        <ItemTable items={quote.items} onChange={setItems} />
      </SectionCard>

      {/* ── GST & Totals ── */}
      <SectionCard title="GST, Discount & Totals">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="GST Type">
            <Select value={quote.gst.type} onValueChange={(v) => setGst({ type: v as Quotation['gst']['type'] })}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cgst_sgst" className="text-xs">CGST + SGST</SelectItem>
                <SelectItem value="igst" className="text-xs">IGST</SelectItem>
                <SelectItem value="none" className="text-xs">No GST</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {quote.gst.type === 'igst' ? (
            <NumberField label="IGST %" value={quote.gst.igst} onChange={(v) => setGst({ igst: v })} />
          ) : quote.gst.type === 'cgst_sgst' ? (
            <>
              <NumberField label="CGST %" value={quote.gst.cgst} onChange={(v) => setGst({ cgst: v })} />
              <NumberField label="SGST %" value={quote.gst.sgst} onChange={(v) => setGst({ sgst: v })} />
            </>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Discount Type">
            <Select value={quote.discount.type} onValueChange={(v) => setDiscount({ type: v as 'percent' | 'amount' })}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent" className="text-xs">Percent (%)</SelectItem>
                <SelectItem value="amount" className="text-xs">Flat Amount</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <NumberField label={quote.discount.type === 'percent' ? 'Discount %' : 'Discount Amount'} value={quote.discount.value} onChange={(v) => setDiscount({ value: v })} />
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2 pb-1">
              <Switch checked={quote.roundOff} onCheckedChange={(v) => patch((d) => void (d.roundOff = v))} id="roundoff" />
              <Label htmlFor="roundoff" className="text-xs">Round off</Label>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Terms & Notes ── */}
      <SectionCard title="Terms, Delivery & Notes">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextAreaField label="Payment Terms" value={quote.details.paymentTerms} onChange={(v) => setDetails({ paymentTerms: v })} rows={3} />
          <TextAreaField label="Delivery Terms" value={quote.details.deliveryTerms} onChange={(v) => setDetails({ deliveryTerms: v })} rows={2} />
          <TextField label="Freight" value={quote.details.freight} onChange={(v) => setDetails({ freight: v })} />
          <TextField label="Validity" value={quote.details.validity} onChange={(v) => setDetails({ validity: v })} />
          <TextAreaField label="Terms & Conditions" className="sm:col-span-2" value={quote.terms} onChange={(v) => patch((d) => void (d.terms = v))} rows={4} />
          <TextAreaField label="Notes" className="sm:col-span-2" value={quote.notes} onChange={(v) => patch((d) => void (d.notes = v))} rows={2} />
          <TextAreaField label="Footer Text" className="sm:col-span-2" value={quote.footer} onChange={(v) => patch((d) => void (d.footer = v))} rows={1} />
        </div>
      </SectionCard>

      {/* ── Appearance ── */}
      <SectionCard title="Appearance & Branding">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Template">
            <Select
              value={quote.templateId}
              onValueChange={(id) => {
                const t = templates.find((x) => x.id === id);
                patch((d) => {
                  d.templateId = id;
                  if (t) {
                    d.theme.accent = t.accent;
                    d.theme.font = t.font;
                  }
                });
                toast.success(`Template “${t?.name ?? ''}” applied`);
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name} {t.isDefault ? '★' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Accent Color">
            <div className="flex items-center gap-1.5">
              {PRESET_ACCENTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTheme({ accent: c })}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: quote.theme.accent === c ? '#0f172a' : 'transparent' }}
                  aria-label={`Accent ${c}`}
                />
              ))}
              <input type="color" value={quote.theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} className="h-7 w-7 cursor-pointer rounded border" />
            </div>
          </Field>
          <Field label="Font">
            <Select value={quote.theme.font} onValueChange={(v) => setTheme({ font: v as 'sans' | 'serif' })}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sans" className="text-xs">Sans-serif (Modern)</SelectItem>
                <SelectItem value="serif" className="text-xs">Serif (Classic)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Watermark Text" value={quote.watermark} onChange={(v) => patch((d) => void (d.watermark = v))} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ToggleRow label="Logo" checked={quote.showLogo} onChange={() => toggle('showLogo')} />
          <ToggleRow label="Signature" checked={quote.showSignature} onChange={() => toggle('showSignature')} />
          <ToggleRow label="Stamp" checked={quote.showStamp} onChange={() => toggle('showStamp')} />
          <ToggleRow label="Payment QR" checked={quote.showQr} onChange={() => toggle('showQr')} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Logo, signature and stamp images are managed in Settings → Company Profile.
        </p>
      </SectionCard>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
