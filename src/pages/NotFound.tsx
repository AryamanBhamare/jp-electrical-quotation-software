import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-6xl font-black text-muted-foreground/40">404</p>
      <p className="text-lg font-semibold">Page not found</p>
      <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild><a href="#/">Back to dashboard</a></Button>
    </div>
  );
}
