import { useRef } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Download,
  ImagePlus,
  Landmark,
  RefreshCcw,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { compressImage, compressSignature } from '@/lib/image';
import { downloadText } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@shared/types';

function ImageUpload({ label, value, onUpload, onRemove, aspect }: { label: string; value: string | null; onUpload: (dataUrl: string) => void; onRemove: () => void; aspect: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        {value ? (
          <img src={value} alt={label} className={`rounded object-contain ${aspect}`} />
        ) : (
          <div className={`flex items-center justify-center rounded ${aspect} border border-dashed text-muted-foreground`}>
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-1">
          <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
          {value ? (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const dataUrl = label === 'Signature' ? await compressSignature(f) : await compressImage(f, 512, 0.85);
              onUpload(dataUrl);
              toast.success(`${label} uploaded`);
            } catch {
              toast.error(`Could not process image: ${f.name}`);
            }
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function Settings() {
  const company = useStore((s) => s.company);
  const settings = useStore((s) => s.settings);
  const updateCompany = useStore((s) => s.updateCompany);
  const updateSettings = useStore((s) => s.updateSettings);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const importRef = useRef<HTMLInputElement>(null);

  const setCompany = (p: Partial<typeof company>) => updateCompany({ ...company, ...p });
  const setBank = (p: Partial<typeof company.bank>) => updateCompany({ ...company, bank: { ...company.bank, ...p } });
  const setSignatory = (p: Partial<typeof company.signatory>) => updateCompany({ ...company, signatory: { ...company.signatory, ...p } });

  const handleImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      const data = json?.data ?? json;
      const res = importData({
        quotations: Array.isArray(data.quotations) ? data.quotations : undefined,
        customers: Array.isArray(data.customers) ? data.customers : undefined,
        settings: data.settings,
        templates: Array.isArray(data.templates) ? data.templates : undefined,
      });
      toast.success(`Imported ${res.count} record(s)`);
    } catch {
      toast.error('Invalid backup file');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Company profile, preferences &amp; data management</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5"><Landmark className="h-3.5 w-3.5" /> Bank &amp; QR</TabsTrigger>
          <TabsTrigger value="prefs" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Preferences</TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5"><RefreshCcw className="h-3.5 w-3.5" /> Data</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card className="glass">
            <CardHeader className="p-5">
              <CardTitle className="text-base">Company profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0">
              <ImageUpload
                label="Logo"
                value={company.logo}
                onUpload={(v) => setCompany({ logo: v })}
                onRemove={() => setCompany({ logo: null })}
                aspect="h-14 w-24"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldBlock label="Title prefix (M/S.)">
                  <Input value={company.titlePrefix} onChange={(e) => setCompany({ titlePrefix: e.target.value })} placeholder="M/S." />
                </FieldBlock>
                <FieldBlock label="Company name *">
                  <Input value={company.name} onChange={(e) => setCompany({ name: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Business description">
                  <Input value={company.businessDesc} onChange={(e) => setCompany({ businessDesc: e.target.value })} placeholder="GOVT. ELECTRICAL CONTRACTOR" />
                </FieldBlock>
                <FieldBlock label="Contact person">
                  <Input value={company.contactPerson} onChange={(e) => setCompany({ contactPerson: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="GSTIN">
                  <Input value={company.gstin} onChange={(e) => setCompany({ gstin: e.target.value.toUpperCase() })} placeholder="27XXXXX0000X1Z5" />
                </FieldBlock>
                <FieldBlock label="PAN">
                  <Input value={company.pan} onChange={(e) => setCompany({ pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
                </FieldBlock>
                <FieldBlock label="Phone">
                  <Input value={company.phone} onChange={(e) => setCompany({ phone: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Email">
                  <Input value={company.email} onChange={(e) => setCompany({ email: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Website">
                  <Input value={company.website} onChange={(e) => setCompany({ website: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="State (Place of Supply)">
                  <Input value={company.state ?? ''} onChange={(e) => setCompany({ state: e.target.value })} placeholder="Maharashtra" />
                </FieldBlock>
                <FieldBlock label="GST State Code">
                  <Input value={company.stateCode ?? ''} onChange={(e) => setCompany({ stateCode: e.target.value })} placeholder="27" />
                </FieldBlock>
              </div>
              <FieldBlock label="Address">
                <Textarea rows={2} value={company.address} onChange={(e) => setCompany({ address: e.target.value })} />
              </FieldBlock>

              <div className="border-t pt-4">
                <CardTitle className="mb-3 text-sm">Authorized signatory</CardTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldBlock label="Name">
                    <Input value={company.signatory.name} onChange={(e) => setSignatory({ name: e.target.value })} />
                  </FieldBlock>
                  <FieldBlock label="Role">
                    <Input value={company.signatory.role} onChange={(e) => setSignatory({ role: e.target.value })} />
                  </FieldBlock>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ImageUpload
                    label="Signature (transparent PNG recommended)"
                    value={company.signatory.image}
                    onUpload={(v) => setSignatory({ image: v })}
                    onRemove={() => setSignatory({ image: null })}
                    aspect="h-14 w-32"
                  />
                  <ImageUpload
                    label="Company stamp"
                    value={company.stamp}
                    onUpload={(v) => setCompany({ stamp: v })}
                    onRemove={() => setCompany({ stamp: null })}
                    aspect="h-14 w-28"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card className="glass">
            <CardHeader className="p-5">
              <CardTitle className="text-base">Bank details &amp; payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldBlock label="Bank name">
                  <Input value={company.bank.name} onChange={(e) => setBank({ name: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Branch">
                  <Input value={company.bank.branch} onChange={(e) => setBank({ branch: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Account holder name">
                  <Input value={company.bank.accountName} onChange={(e) => setBank({ accountName: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Account number">
                  <Input value={company.bank.accountNumber} onChange={(e) => setBank({ accountNumber: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="IFSC">
                  <Input value={company.bank.ifsc} onChange={(e) => setBank({ ifsc: e.target.value.toUpperCase() })} />
                </FieldBlock>
                <FieldBlock label="UPI ID (for payment QR)">
                  <Input value={company.bank.upi} onChange={(e) => setBank({ upi: e.target.value })} placeholder="jpelectricals@upi" />
                </FieldBlock>
              </div>
              <ImageUpload
                label="Payment QR code"
                value={company.bank.qr}
                onUpload={(v) => setBank({ qr: v })}
                onRemove={() => setBank({ qr: null })}
                aspect="h-14 w-14"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prefs">
          <Card className="glass">
            <CardHeader className="p-5">
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldBlock label="Theme">
                  <Select value={settings.theme === 'system' ? 'light' : settings.theme} onValueChange={(v) => updateSettings({ theme: v as 'light' | 'dark' })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light" className="text-xs">Light</SelectItem>
                      <SelectItem value="dark" className="text-xs">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="Language">
                  <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en" className="text-xs">English</SelectItem>
                      <SelectItem value="hi" className="text-xs">हिन्दी (Hindi)</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="Currency">
                  <Select value={settings.currency.code} onValueChange={(v) => updateSettings({ currency: CURRENCIES.find((c) => c.code === v) ?? settings.currency })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="text-xs">{c.symbol} {c.code} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="Date format">
                  <Select value={settings.dateFormat} onValueChange={(v) => updateSettings({ dateFormat: v })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY" className="text-xs">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY" className="text-xs">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD-MM-YYYY" className="text-xs">DD-MM-YYYY</SelectItem>
                      <SelectItem value="DD MMM YYYY" className="text-xs">DD MMM YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD" className="text-xs">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="Quotation number prefix">
                  <Input value={settings.quotePrefix} onChange={(e) => updateSettings({ quotePrefix: e.target.value.toUpperCase() })} />
                </FieldBlock>
                <FieldBlock label="Quotation year">
                  <Input value={settings.quoteYear} onChange={(e) => updateSettings({ quoteYear: e.target.value })} />
                </FieldBlock>
                <FieldBlock label="Invoice number prefix">
                  <Input value={settings.invoicePrefix} onChange={(e) => updateSettings({ invoicePrefix: e.target.value.toUpperCase() })} />
                </FieldBlock>
                <FieldBlock label="Default watermark text">
                  <Input value={settings.watermarkText} onChange={(e) => updateSettings({ watermarkText: e.target.value })} />
                </FieldBlock>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <Label className="text-sm">Auto-save</Label>
                    <p className="text-xs text-muted-foreground">Save the open quotation automatically</p>
                  </div>
                  <Switch checked={settings.autoSave} onCheckedChange={(v) => updateSettings({ autoSave: v })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FieldBlock label="Default CGST %">
                  <Input type="number" value={settings.gst.cgst} onChange={(e) => updateSettings({ gst: { ...settings.gst, cgst: Number(e.target.value) || 0 } })} />
                </FieldBlock>
                <FieldBlock label="Default SGST %">
                  <Input type="number" value={settings.gst.sgst} onChange={(e) => updateSettings({ gst: { ...settings.gst, sgst: Number(e.target.value) || 0 } })} />
                </FieldBlock>
                <FieldBlock label="Default IGST %">
                  <Input type="number" value={settings.gst.igst} onChange={(e) => updateSettings({ gst: { ...settings.gst, igst: Number(e.target.value) || 0 } })} />
                </FieldBlock>
              </div>

              <FieldBlock label="Default terms">
                <Textarea rows={5} value={settings.defaultTerms} onChange={(e) => updateSettings({ defaultTerms: e.target.value })} />
              </FieldBlock>
              <FieldBlock label="Default notes">
                <Textarea rows={2} value={settings.defaultNotes} onChange={(e) => updateSettings({ defaultNotes: e.target.value })} />
              </FieldBlock>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card className="glass">
            <CardHeader className="p-5">
              <CardTitle className="text-base">Backup &amp; restore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <p className="text-xs text-muted-foreground">
                All data is stored locally in your browser. Export a backup file to move to another device, or restore from a previous backup.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => downloadText(exportData(), 'jpe-backup.json', 'application/json')}>
                  <Download className="h-4 w-4" /> Export backup
                </Button>
                <Button variant="outline" onClick={() => importRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Import backup
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImport(f);
                    e.target.value = '';
                  }}
                />
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-2 text-xs text-destructive">Danger zone</p>
                <Button variant="destructive" size="sm" onClick={() => { if (confirm('Erase ALL data? This cannot be undone.')) { resetAll(); toast.success('All data cleared'); } }}>
                  <Trash2 className="h-4 w-4" /> Reset everything
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
