import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LangContext, type Lang } from '@/lib/i18n';
import { useStore } from '@/store/useStore';
import { AppShell } from '@/components/layout/AppShell';
import { FullPageLoader } from '@/components/layout/FullPageLoader';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Upload = lazy(() => import('@/pages/Upload'));
const Editor = lazy(() => import('@/pages/Editor'));
const Quotations = lazy(() => import('@/pages/Quotations'));
const Customers = lazy(() => import('@/pages/Customers'));
const Templates = lazy(() => import('@/pages/Templates'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Settings = lazy(() => import('@/pages/Settings'));
const Share = lazy(() => import('@/pages/Share'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export default function App() {
  const lang = useStore((s) => s.settings.language) as Lang;
  return (
    <LangContext.Provider value={lang}>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route
              index
              element={
                <Suspense fallback={<PageFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="upload"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Upload />
                </Suspense>
              }
            />
            <Route
              path="editor/:id"
              element={
                <Suspense fallback={<FullPageLoader />}>
                  <Editor />
                </Suspense>
              }
            />
            <Route
              path="quotations"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Quotations />
                </Suspense>
              }
            />
            <Route
              path="customers"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Customers />
                </Suspense>
              }
            />
            <Route
              path="templates"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Templates />
                </Suspense>
              }
            />
            <Route
              path="analytics"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Analytics />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Settings />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route
            path="share/:code"
            element={
              <Suspense fallback={<FullPageLoader />}>
                <Share />
              </Suspense>
            }
          />
        </Routes>
      </HashRouter>
    </LangContext.Provider>
  );
}
