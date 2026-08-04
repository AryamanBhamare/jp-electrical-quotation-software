import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      theme="system"
      toastOptions={{
        classNames: {
          toast: '!rounded-xl !border !bg-background !text-foreground !shadow-lg',
          description: '!text-muted-foreground',
        },
      }}
    />
  );
}
