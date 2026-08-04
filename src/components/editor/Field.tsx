import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function Field({ label, children, className, required }: { label: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

export function TextField({ label, value, onChange, className, placeholder, type, required }: TextFieldProps) {
  const commit = useStore((s) => s.commitHistory);
  return (
    <Field label={label} className={className} required={required}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onFocus={commit}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}

export function TextAreaField({ label, value, onChange, className, rows, placeholder }: TextAreaFieldProps) {
  const commit = useStore((s) => s.commitHistory);
  return (
    <Field label={label} className={className}>
      <Textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onFocus={commit}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: number;
  min?: number;
  prefix?: string;
  required?: boolean;
}

export function NumberField({ label, value, onChange, className, step = 1, min = 0, prefix, required }: NumberFieldProps) {
  const commit = useStore((s) => s.commitHistory);
  return (
    <Field label={label} className={className} required={required}>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span> : null}
        <Input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          className={prefix ? 'pl-7' : ''}
          onFocus={commit}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
    </Field>
  );
}
