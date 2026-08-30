import { useEffect, type ReactNode } from 'react';
import { useStore } from '@/store/useStore';

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#171717' : '#ffffff');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.settings.theme);
  const effectiveTheme: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  return <>{children}</>;
}
