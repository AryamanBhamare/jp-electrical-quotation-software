import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

// Persists the actively-edited quotation to the quotations list after debounce.
export function useAutosave(delay = 1200) {
  const timer = useRef<number | null>(null);
  const current = useStore((s) => s.current);
  const saveQuotation = useStore((s) => s.saveQuotation);
  const autoSaveEnabled = useStore((s) => s.settings.autoSave);

  useEffect(() => {
    if (!current || !autoSaveEnabled) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveQuotation(current);
    }, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [current, autoSaveEnabled, saveQuotation, delay]);

  return { autoSaveEnabled };
}
