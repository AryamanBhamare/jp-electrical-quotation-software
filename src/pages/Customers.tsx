import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Building2, Mail, Pencil, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
import type { CustomerDetails } from '@shared/types';
import { emptyCustomer, INDIAN_STATES } from '@shared/types';
import { uid } from '@/lib/id';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional().default(''),
  attention: z.string().optional().default(''),
  gstin: z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || /^[0-9A-Z]{15}$/.test(v.toUpperCase()), 'GSTIN must be 15 characters'),
  pan: z.string().optional().default('').refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()), 'Invalid PAN format'),
  email: z.string().optional().default('').refine((v) => !v || z.string().email().safeParse(v).success, 'Invalid email'),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  pincode: z.string().optional().default('').refine((v) => !v || /^[1-9][0-9]{5}$/.test(v), 'Invalid pincode'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

function CustomerFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: CustomerDetails | null;
  onSave: (c: CustomerDetails) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema), defaultValues: {} });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              name: initial.name,
              company: initial.company,
              attention: initial.attention,
              gstin: initial.gstin,
              pan: initial.pan,
              email: initial.email,
              phone: initial.phone,
              address: initial.address,
              city: initial.city,
              state: initial.state,
              pincode: initial.pincode,
            }
          : {},
      );
    }
  }, [open, initial, reset]);

  const submit = handleSubmit((values) => {
    const c: CustomerDetails = {
      id: initial?.id ?? uid('cust'),
      name: values.name,
      company: values.company ?? '',
      attention: values.attention ?? '',
      gstin: (values.gstin ?? '').toUpperCase(),
      pan: (values.pan ?? '').toUpperCase(),
      email: values.email ?? '',
      phone: values.phone ?? '',
      address: values.address ?? '',
      city: values.city ?? '',
      state: values.state ?? '',
      pincode: values.pincode ?? '',
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(c);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit customer' : 'Add customer'}</DialogTitle>
          <DialogDescription>Saved customers autocomplete in the quotation editor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Contact Person *</Label>
            <Input id="c-name" placeholder="e.g. Ramesh Kumar" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-company">Company</Label>
            <Input id="c-company" placeholder="Company Pvt Ltd" {...register('company')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-attention">Attention / To</Label>
            <Input id="c-attention" placeholder="PURCHASE MANAGER" {...register('attention')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-gstin">GSTIN</Label>
            <Input id="c-gstin" placeholder="27XXXXX0000X1Z5" {...register('gstin')} />
            {errors.gstin ? <p className="text-xs text-destructive">{errors.gstin.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-pan">PAN</Label>
            <Input id="c-pan" placeholder="ABCDE1234F" {...register('pan')} />
            {errors.pan ? <p className="text-xs text-destructive">{errors.pan.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" placeholder="+91 98765 43210" {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" placeholder="billing@company.com" {...register('email')} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-address">Address</Label>
            <Textarea id="c-address" rows={2} placeholder="Street, area, city…" {...register('address')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-city">City</Label>
            <Input id="c-city" placeholder="Ahmedabad" {...register('city')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-state">State</Label>
            <Input id="c-state" list="cust-states" placeholder="Select state…" {...register('state')} />
            <datalist id="cust-states">
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-pin">Pincode</Label>
            <Input id="c-pin" placeholder="380001" {...register('pincode')} />
            {errors.pincode ? <p className="text-xs text-destructive">{errors.pincode.message}</p> : null}
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initial ? 'Save changes' : 'Add customer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const customers = useStore((s) => s.customers);
  const add = useStore((s) => s.addCustomer);
  const update = useStore((s) => s.updateCustomer);
  const remove = useStore((s) => s.deleteCustomer);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDetails | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const handleSave = (c: CustomerDetails) => {
    const existing = editing != null;
    if (existing) {
      update(c);
      toast.success('Customer updated');
    } else {
      const dup = customers.find((x) => x.gstin && c.gstin && x.gstin === c.gstin);
      if (dup) {
        toast.warning('Duplicate customer detected — GSTIN already exists for ' + (dup.company || dup.name));
      }
      add(c);
      toast.success('Customer added');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} saved · autocomplete everywhere</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" className="w-56 pl-8" />
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Building2 className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">No customers yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">Add your first customer or save one from the quotation editor.</p>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="mt-1">
              <Plus className="h-4 w-4" /> Add customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.company || c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.name}</div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        onClick={() => {
                          remove(c.id);
                          toast.success('Customer deleted');
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {c.address ? <p className="line-clamp-2">{c.address}</p> : null}
                    {c.city ? <p>{[c.city, c.state, c.pincode].filter(Boolean).join(', ')}</p> : null}
                    {c.phone ? (
                      <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</p>
                    ) : null}
                    {c.email ? (
                      <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" /> {c.email}</p>
                    ) : null}
                    {c.gstin ? <p className="font-mono">GSTIN: {c.gstin}</p> : null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={handleSave} />
    </div>
  );
}
