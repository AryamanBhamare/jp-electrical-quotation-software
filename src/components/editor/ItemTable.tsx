import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import type { QuoteItem } from '@shared/types';
import { emptyItem } from '@/services/builder';
import { itemAmount } from '@/lib/calculations';
import { uid } from '@/lib/id';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
}

export function ItemTable({ items, onChange }: Props) {
  const commit = useStore((s) => s.commitHistory);
  const [query, setQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const editingIndex = useRef(-1);

  const update = (index: number, patch: Partial<QuoteItem>) => {
    const next = items.map((it, i) => {
      if (i !== index) return it;
      const updated = { ...it, ...patch };
      updated.amount = itemAmount(updated);
      return updated;
    });
    onChange(renumber(next));
  };

  const renumber = (list: QuoteItem[]): QuoteItem[] => list.map((it, i) => ({ ...it, srNo: i + 1 }));

  const addRow = (after?: number) => {
    commit();
    const item = emptyItem(items.length + 1);
    const next = after == null ? [...items, item] : [...items.slice(0, after + 1), item, ...items.slice(after + 1)];
    onChange(renumber(next));
  };

  const deleteRow = (index: number) => {
    commit();
    onChange(renumber(items.filter((_, i) => i !== index)));
  };

  const duplicateRow = (index: number) => {
    commit();
    const copy = { ...items[index], id: uid('it'), srNo: index + 2 };
    const next = [...items.slice(0, index + 1), copy, ...items.slice(index + 1)];
    onChange(renumber(next));
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    commit();
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(renumber(next));
  };

  const dropRow = (target: number) => {
    if (dragIndex == null || dragIndex === target) return;
    commit();
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    setDragIndex(null);
    onChange(renumber(next));
  };

  const filtered = query.trim()
    ? items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) =>
          [it.description, it.hsnCode, it.drawingNo, it.revision].join(' ').toLowerCase().includes(query.toLowerCase()),
        )
        .map((x) => x.i)
    : null;

  const visible = filtered ?? items.map((_, i) => i);

  const tdInput =
    'h-8 w-full rounded border border-transparent bg-transparent px-1.5 text-xs outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary dark:focus:bg-neutral-800';
  const tdMini = tdInput + ' h-7 text-[11px]';

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, index: number, col: string) => {
    const rowIdx = visible.indexOf(index);
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = visible[rowIdx + 1];
      if (next != null) {
        const el = document.querySelector<HTMLInputElement>(`[data-cell="${next}:${col}"]`);
        el?.focus();
      } else {
        addRow();
        requestAnimationFrame(() => {
          const last = visible.length;
          const el = document.querySelector<HTMLInputElement>(`[data-cell="${last}:${col}"]`);
          el?.focus();
        });
      }
    }
    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => addRow()}>
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item…" className="h-8 w-48 pl-8 text-xs" />
          {query ? (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="w-8 p-2"></th>
              <th className="w-8 p-2 text-center">#</th>
              <th className="p-2">Description</th>
              <th className="w-24 p-2">HSN CODE</th>
              <th className="w-20 p-2 text-center">QTY</th>
              <th className="w-24 p-2 text-right">PRICE</th>
              <th className="w-24 p-2 text-right">AMOUNT</th>
              <th className="w-28 p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                  No items. Click <span className="font-medium">Add Row</span> or upload a PO to auto-fill.
                </td>
              </tr>
            ) : (
              visible.map((i) => {
                const it = items[i];
                return (
                  <tr
                    key={it.id}
                    draggable={dragIndex === i}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIndex !== i) e.currentTarget.classList.add('bg-primary/5');
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('bg-primary/5')}
                    onDrop={(e) => {
                      e.currentTarget.classList.remove('bg-primary/5');
                      dropRow(i);
                    }}
                    className={cn('border-t align-top transition-colors hover:bg-muted/30', dragIndex === i && 'opacity-40')}
                  >
                    <td className="p-1 text-center">
                      <span
                        draggable
                        onDragStart={(e) => {
                          setDragIndex(i);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className="inline-flex cursor-grab text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                    </td>
                    <td className="p-1 pt-2 text-center font-medium text-muted-foreground">{i + 1}</td>
                    <td className="p-1">
                      <textarea
                        data-cell={`${i}:desc`}
                        className="h-auto min-h-[52px] w-full resize-y rounded-md border border-border bg-background/70 px-2 py-1.5 text-xs leading-5 outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary dark:bg-neutral-900/50 dark:focus:bg-neutral-800"
                        rows={Math.max(2, Math.min(8, it.description.split('\n').length + Math.floor(it.description.length / 38)))}
                        value={it.description}
                        spellCheck={false}
                        onFocus={(e) => {
                          commit();
                          editingIndex.current = i;
                          e.currentTarget.select();
                        }}
                        onChange={(e) => update(i, { description: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') e.currentTarget.blur();
                        }}
                        placeholder={'Type / paste the item here…\n(e.g.) 1) PLANT GOVT. ANNUAL ELECTRICAL\nINSTALLATION INSPECTION CHARGES.\nWORK INCLUDE :-\n• PLANT GOVT. ELECTRICAL INSTALLATION\n  AUDIT REPORT MAKING & SUBMISSION.'}
                      />
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          data-cell={`${i}:dwg`}
                          className={tdMini}
                          value={it.drawingNo}
                          onFocus={commit}
                          onChange={(e) => update(i, { drawingNo: e.target.value })}
                          placeholder="Drg No"
                        />
                        <input
                          data-cell={`${i}:rev`}
                          className={tdMini}
                          value={it.revision}
                          onFocus={commit}
                          onChange={(e) => update(i, { revision: e.target.value })}
                          placeholder="Rev"
                        />
                        <input
                          data-cell={`${i}:unit`}
                          className={tdMini}
                          value={it.unit}
                          onFocus={commit}
                          onChange={(e) => update(i, { unit: e.target.value })}
                          placeholder="Unit"
                        />
                      </div>
                    </td>
                    <td className="p-1">
                      <input
                        data-cell={`${i}:hsn`}
                        className={tdInput}
                        value={it.hsnCode}
                        onFocus={commit}
                        onChange={(e) => update(i, { hsnCode: e.target.value })}
                        onKeyDown={(e) => handleKey(e, i, 'hsn')}
                        placeholder="—"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        data-cell={`${i}:qty`}
                        type="number"
                        min={0}
                        className={tdInput + ' text-right'}
                        value={it.quantity}
                        onFocus={commit}
                        onChange={(e) => update(i, { quantity: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleKey(e, i, 'qty')}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        data-cell={`${i}:rate`}
                        type="number"
                        min={0}
                        step="any"
                        className={tdInput + ' text-right'}
                        value={it.rate}
                        onFocus={commit}
                        onChange={(e) => update(i, { rate: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleKey(e, i, 'rate')}
                      />
                    </td>
                    <td className="p-1 pt-2 text-right font-medium">{it.amount.toFixed(2)}</td>
                    <td className="p-1">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => moveRow(i, -1)} disabled={i === 0} className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30" title="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => moveRow(i, 1)} disabled={i === items.length - 1} className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30" title="Move down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => duplicateRow(i)} className="rounded p-1 text-muted-foreground hover:bg-accent" title="Duplicate row">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteRow(i)} className="rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive" title="Delete row">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Tip: press <kbd className="rounded border px-1">Enter</kbd> to move to the next row, drag the handle to reorder.
      </p>
    </div>
  );
}
