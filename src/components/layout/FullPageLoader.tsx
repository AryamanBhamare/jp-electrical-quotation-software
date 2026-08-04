import { cn } from '@/lib/utils';

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <div className="absolute inset-3 animate-pulse rounded-full bg-primary/20" />
      </div>
      <p className={cn('text-sm text-muted-foreground')}>{label}</p>
    </div>
  );
}
