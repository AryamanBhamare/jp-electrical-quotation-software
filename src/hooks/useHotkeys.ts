import { useEffect, type DependencyList } from 'react';

type Handler = (e: KeyboardEvent) => void;

const NAMED: Record<string, string> = {
  ctrl: 'ctrlKey',
  meta: 'metaKey',
  shift: 'shiftKey',
  alt: 'altKey',
};

function parseCombo(combo: string): { key: string; mods: string[] } {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const mods = parts.filter((p) => NAMED[p]);
  const key = parts.filter((p) => !NAMED[p])[0] ?? '';
  return { key: key.toLowerCase(), mods };
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const { key, mods } = parseCombo(combo);
  if (key && e.key.toLowerCase() !== key) return false;
  const state = {
    ctrl: e.ctrlKey || e.metaKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
  };
  for (const m of ['ctrl', 'meta', 'shift', 'alt']) {
    const required = mods.includes(m);
    if (required !== state[m as keyof typeof state]) return false;
  }
  return true;
}

/**
 * Registers keyboard shortcuts. `combo` supports "ctrl+s", "ctrl+shift+z", "meta+enter".
 */
export function useHotkeys(
  bindings: Array<{ combo: string; handler: Handler; when?: boolean }>,
  deps: DependencyList = [],
): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const b of bindings) {
        if (b.when === false) continue;
        if (matches(e, b.combo)) {
          e.preventDefault();
          b.handler(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, bindings]);
}
