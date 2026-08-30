// Global app store (Zustand). Persists quotations, customers, settings, templates,
// analytics & audit log to localStorage; keeps the active editor state + undo/redo in memory.
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  AppSettings,
  AuditAction,
  AuditEntry,
  CompanyDetails,
  CustomerDetails,
  Quotation,
  QuoteTemplate,
} from '@shared/types';
import { uid } from '@/lib/id';
import { defaultCompany, defaultSettings, defaultTemplates } from '@/lib/defaults';
import { todayISO } from '@/lib/format';
import { storage } from '@/services/storage';
import { buildBlankQuotation, buildBlankInvoice, buildInvoiceFromQuotation, nextQuoteNumber } from '@/services/builder';

const jsonStorage: StateStorage = {
  getItem: (name) => storage.read<string | null>(name, null) as unknown as string,
  setItem: (name, value) => void storage.write(name, value),
  removeItem: (name) => storage.remove(name),
};

const HISTORY_LIMIT = 30;
const MAX_SNAPSHOTS = 10;

interface StoreState {
  // persisted
  quotations: Quotation[];
  customers: CustomerDetails[];
  settings: AppSettings;
  templates: QuoteTemplate[];
  company: CompanyDetails;
  audit: AuditEntry[];
  analytics: Record<string, { created: number; exported: number }>;

  // live editor state
  current: Quotation | null;
  past: Quotation[];
  future: Quotation[];

  // actions
  setCurrent: (q: Quotation | null) => void;
  patchCurrent: (patch: (draft: Quotation) => void, recordHistory?: boolean) => void;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  createBlank: () => string;
  createBlankInvoice: () => string;
  createInvoiceFromQuotation: (id: string) => string | null;

  saveQuotation: (q: Quotation) => void;
  deleteQuotation: (id: string) => void;
  duplicateQuotation: (id: string) => string | null;
  renameQuotation: (id: string, title: string) => void;
  setStatus: (id: string, status: 'draft' | 'final') => void;
  addSnapshot: (q: Quotation, label: string) => void;

  addCustomer: (c: CustomerDetails) => void;
  updateCustomer: (c: CustomerDetails) => void;
  deleteCustomer: (id: string) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
  updateCompany: (c: CompanyDetails) => void;

  addTemplate: (t: QuoteTemplate) => void;
  updateTemplate: (t: QuoteTemplate) => void;
  deleteTemplate: (id: string) => void;
  setDefaultTemplate: (id: string) => void;

  logAudit: (action: AuditAction, detail: string) => void;
  trackCreated: (date?: string) => void;
  trackExported: (date?: string) => void;

  importData: (data: Partial<Pick<StoreState, 'quotations' | 'customers' | 'settings' | 'templates'>>) => { ok: boolean; count: number };
  exportData: () => string;
  resetAll: () => void;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const stripHistory = (q: Quotation): Quotation => ({ ...clone(q), history: [] });

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      quotations: [],
      customers: [],
      settings: defaultSettings(),
      templates: defaultTemplates(),
      company: defaultCompany(),
      audit: [],
      analytics: {},

      current: null,
      past: [],
      future: [],

      setCurrent: (q) => set({ current: q ? clone(q) : null, past: [], future: [] }),

      commitHistory: () => {
        const { current, past } = get();
        if (!current) return;
        const snap = stripHistory(current);
        set({ past: [...past.slice(-(HISTORY_LIMIT - 1)), snap], future: [] });
      },

      patchCurrent: (patch, recordHistory = false) => {
        const { current, past } = get();
        if (!current) return;
        const draft = clone(current);
        if (recordHistory) {
          const snap = stripHistory(current);
          set({ past: [...past.slice(-(HISTORY_LIMIT - 1)), snap], future: [] });
        }
        patch(draft);
        draft.updatedAt = new Date().toISOString();
        set({ current: draft });
      },

      undo: () => {
        const { past, future, current } = get();
        if (past.length === 0 || !current) return;
        const prev = past[past.length - 1];
        const snap = stripHistory(current);
        set({ current: clone(prev), past: past.slice(0, -1), future: [...future, snap].slice(-HISTORY_LIMIT) });
      },

      redo: () => {
        const { past, future, current } = get();
        if (future.length === 0 || !current) return;
        const next = future[future.length - 1];
        const snap = stripHistory(current);
        set({ current: clone(next), past: [...past, snap].slice(-HISTORY_LIMIT), future: future.slice(0, -1) });
      },

      createBlank: () => {
        const { settings, company } = get();
        const seq = settings.quoteSeq + 1;
        const quoteNo = nextQuoteNumber(settings.quotePrefix, settings.quoteYear, seq);
        const q = buildBlankQuotation(quoteNo, company, settings);
        set({ current: q, past: [], future: [] });
        get().updateSettings({ quoteSeq: seq });
        return q.id;
      },

      createBlankInvoice: () => {
        const { settings, company } = get();
        const q = buildBlankInvoice(company, settings);
        set({ current: q, past: [], future: [] });
        get().updateSettings({ invoiceSeq: settings.invoiceSeq + 1 });
        get().logAudit('CREATE', `Created invoice ${q.invoice?.invoiceNo ?? ''}`);
        return q.id;
      },

      createInvoiceFromQuotation: (id) => {
        const src = get().quotations.find((x) => x.id === id);
        if (!src) return null;
        const { settings, company } = get();
        const q = buildInvoiceFromQuotation(src, company, settings);
        set({ quotations: [q, ...get().quotations], current: q, past: [], future: [] });
        get().updateSettings({ invoiceSeq: settings.invoiceSeq + 1 });
        get().logAudit('CREATE', `Invoice ${q.invoice?.invoiceNo ?? ''} from quotation ${src.details.quoteNo}`);
        return q.id;
      },

      saveQuotation: (q) => {
        const clean = clone(q);
        const exists = get().quotations.some((x) => x.id === q.id);
        const list = exists ? get().quotations.map((x) => (x.id === q.id ? clean : x)) : [clean, ...get().quotations];
        set({ quotations: list });
        if (!exists) get().trackCreated();
        get().logAudit('UPDATE', `Saved ${q.details.quoteNo}`);
      },

      deleteQuotation: (id) => {
        const q = get().quotations.find((x) => x.id === id);
        set({ quotations: get().quotations.filter((x) => x.id !== id) });
        get().logAudit('DELETE', `Deleted ${q?.details.quoteNo ?? id}`);
      },

      duplicateQuotation: (id) => {
        const q = get().quotations.find((x) => x.id === id);
        if (!q) return null;
        const copy = clone(q);
        copy.id = uid('q');
        copy.title = `${q.title} (Copy)`;
        copy.details = { ...q.details, quoteNo: `${q.details.quoteNo} (Copy)` };
        copy.createdAt = new Date().toISOString();
        copy.updatedAt = copy.createdAt;
        copy.status = 'draft';
        copy.history = [];
        set({ quotations: [copy, ...get().quotations] });
        get().logAudit('DUPLICATE', `Duplicated ${q.details.quoteNo}`);
        return copy.id;
      },

      renameQuotation: (id, title) => {
        set({ quotations: get().quotations.map((x) => (x.id === id ? { ...x, title } : x)) });
      },

      setStatus: (id, status) => {
        set({
          quotations: get().quotations.map((x) =>
            x.id === id ? { ...x, status, updatedAt: new Date().toISOString() } : x,
          ),
        });
      },

      addSnapshot: (q, label) => {
        const snap = clone(q);
        snap.history = [];
        const updated = {
          ...q,
          version: q.version + 1,
          history: [
            ...q.history.slice(-(MAX_SNAPSHOTS - 1)),
            { version: q.version, at: new Date().toISOString(), label, data: snap },
          ],
        };
        set({
          quotations: get().quotations.map((x) => (x.id === q.id ? updated : x)),
          current: get().current?.id === q.id ? updated : get().current,
        });
        get().logAudit('UPDATE', `Version ${q.version + 1} saved for ${q.details.quoteNo}`);
      },

      addCustomer: (c) => {
        const dup = get().customers.find(
          (x) => x.name.toLowerCase() === c.name.toLowerCase() && x.phone && c.phone && x.phone === c.phone,
        );
        if (dup) return;
        set({ customers: [clone(c), ...get().customers] });
      },
      updateCustomer: (c) => {
        set({ customers: get().customers.map((x) => (x.id === c.id ? clone(c) : x)) });
      },
      deleteCustomer: (id) => {
        set({ customers: get().customers.filter((x) => x.id !== id) });
      },

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      updateCompany: (c) => set({ company: clone(c) }),

      addTemplate: (t) => set({ templates: [...get().templates, t] }),
      updateTemplate: (t) => set({ templates: get().templates.map((x) => (x.id === t.id ? t : x)) }),
      deleteTemplate: (id) => {
        const t = get().templates.find((x) => x.id === id);
        if (t?.isSystem) return;
        const remaining = get().templates.filter((x) => x.id !== id);
        set({
          templates: t?.isDefault && remaining.length ? remaining.map((x, i) => (i === 0 ? { ...x, isDefault: true } : x)) : remaining,
        });
      },
      setDefaultTemplate: (id) =>
        set({ templates: get().templates.map((x) => ({ ...x, isDefault: x.id === id })) }),

      logAudit: (action, detail) => {
        const entry: AuditEntry = { id: uid('a'), at: new Date().toISOString(), action, detail };
        set({ audit: [entry, ...get().audit].slice(0, 500) });
      },

      trackCreated: (date) => {
        const key = date ?? todayISO();
        const cur = get().analytics[key] ?? { created: 0, exported: 0 };
        set({ analytics: { ...get().analytics, [key]: { ...cur, created: cur.created + 1 } } });
      },
      trackExported: (date) => {
        const key = date ?? todayISO();
        const cur = get().analytics[key] ?? { created: 0, exported: 0 };
        set({ analytics: { ...get().analytics, [key]: { ...cur, exported: cur.exported + 1 } } });
      },

      importData: (data) => {
        let count = 0;
        const next = { ...get() };
        if (Array.isArray(data.quotations)) {
          next.quotations = data.quotations as Quotation[];
          count += data.quotations.length;
        }
        if (Array.isArray(data.customers)) {
          next.customers = data.customers as CustomerDetails[];
          count += data.customers.length;
        }
        if (data.settings) {
          next.settings = { ...defaultSettings(), ...(data.settings as AppSettings) };
          count += 1;
        }
        if (Array.isArray(data.templates) && data.templates.length) {
          next.templates = data.templates as QuoteTemplate[];
          count += 1;
        }
        set(next);
        get().logAudit('IMPORT', `Imported ${count} record(s)`);
        return { ok: true, count };
      },

      exportData: () => {
        const s = get();
        return JSON.stringify(
          { app: 'jpe-quotation-studio', version: 1, exportedAt: new Date().toISOString(), data: { quotations: s.quotations, customers: s.customers, settings: s.settings, templates: s.templates } },
          null,
          2,
        );
      },

      resetAll: () => {
        storage.clearAll();
        set({
          quotations: [],
          customers: [],
          settings: defaultSettings(),
          templates: defaultTemplates(),
          audit: [],
          analytics: {},
          company: defaultCompany(),
          current: null,
          past: [],
          future: [],
        });
      },
    }),
    {
      name: 'jpe-store',
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => ({
        quotations: s.quotations,
        customers: s.customers,
        settings: s.settings,
        templates: s.templates,
        company: s.company,
        audit: s.audit,
        analytics: s.analytics,
      }),
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        const base = defaultTemplates();
        let templates: QuoteTemplate[] = Array.isArray(p.templates) ? (p.templates as QuoteTemplate[]) : base;
        templates = templates.map((t) => ({
          ...t,
          tableStyle: t.tableStyle ?? 'bordered',
        }));
        const existing = new Set(templates.map((t) => t.id));
        for (const def of base) {
          if (!existing.has(def.id)) {
            templates = [...templates, def];
            existing.add(def.id);
          }
        }
        return { ...p, templates };
      },
    },
  ),
);

// ── Selector helpers ─────────────────────────────────────────
export const selectCompany = (s: StoreState): CompanyDetails => s.company;

export function getDefaultTemplate(templates: QuoteTemplate[]): QuoteTemplate {
  return templates.find((t) => t.isDefault) ?? templates[0];
}
