import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionCard({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn('glass rounded-xl p-4 sm:p-5', className)}>
      <header className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}
