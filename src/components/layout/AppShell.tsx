import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Gauge,
  Home,
  LayoutTemplate,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Upload,
  Users,
  BarChart3,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/upload', label: 'Upload PO', icon: Upload },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function ThemeToggle() {
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <button
      onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/30">
        <Zap className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-extrabold tracking-tight">JP Electricals</div>
        <div className="text-[10px] text-muted-foreground">Quotation Studio</div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const location = useLocation();
  const navigate = useNavigate();
  const createBlank = useStore((s) => s.createBlank);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const goNew = () => {
    const id = createBlank();
    navigate(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen">
      {/* decorative background */}
      <div className="pointer-events-none fixed inset-0 -z-10 gradient-hero" />

      {/* sidebar (desktop) */}
      {isDesktop ? (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-background/70 backdrop-blur-xl">
          <div className="px-5 py-5">
            <Brand />
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4">
            <button
              onClick={goNew}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4" /> New Quotation
            </button>
          </div>
        </aside>
      ) : (
        // mobile header
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4">
            <Brand />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {mobileOpen ? (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t bg-background/95"
              >
                <div className="space-y-1 px-4 py-3">
                  {NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  ))}
                  <button
                    onClick={goNew}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" /> New Quotation
                  </button>
                </div>
              </motion.nav>
            ) : null}
          </AnimatePresence>
        </header>
      )}

      {/* main */}
      <div className={cn('flex min-h-screen flex-col', isDesktop && 'lg:pl-60')}>
        {/* topbar */}
        {isDesktop ? (
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/60 px-6 backdrop-blur-xl">
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={goNew}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow"
              >
                <Plus className="h-4 w-4" /> New
              </button>
            </div>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <footer className="pb-6 text-center text-xs text-muted-foreground">
          JP Electrical Quotation Studio · Runs 100% in your browser · Works offline
        </footer>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const quotations = useStore((s) => s.quotations);
  const customers = useStore((s) => s.customers);

  const results = q.trim()
    ? quotations
        .filter(
          (x) =>
            x.details.quoteNo.toLowerCase().includes(q.toLowerCase()) ||
            x.details.poNumber.toLowerCase().includes(q.toLowerCase()) ||
            x.customer.name.toLowerCase().includes(q.toLowerCase()) ||
            x.items.some((it) => it.description.toLowerCase().includes(q.toLowerCase())),
        )
        .slice(0, 6)
    : [];
  const custResults = q.trim() ? customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.company.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : [];

  return (
    <div className="relative w-72">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search quotations, PO no, items…"
        className="h-9 w-full rounded-md border bg-background/70 pl-8 pr-3 text-sm outline-none ring-offset-background transition-shadow focus-visible:ring-1 focus-visible:ring-ring"
      />
      {q.trim() ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover shadow-xl">
          {results.length === 0 && custResults.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">No results for “{q}”</div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-1.5">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/editor/${r.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate font-medium">{r.details.quoteNo}</span>
                  <span className="ml-3 truncate text-xs text-muted-foreground">{r.customer.company || r.customer.name}</span>
                </button>
              ))}
              {custResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate('/customers')}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="ml-3 truncate text-xs text-muted-foreground">{c.company}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
