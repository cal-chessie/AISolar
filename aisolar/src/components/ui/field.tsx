/**
 * Field — Cal.com-grade form anatomy, one component.
 *
 *   <Field label="Monthly bill" required helper="From your electricity bill"
 *          error={errors.bill} htmlFor="bill">
 *     <InputGroup prefix="€"><Input id="bill" inputMode="decimal" /></InputGroup>
 *   </Field>
 *
 * Enforces the rules every view kept breaking:
 *  - VISIBLE label above the input (never placeholder-only)
 *  - helper text below (persistent, not a tooltip)
 *  - error replaces helper, sits under the field, role=alert, icon + colour
 *  - aria-invalid + aria-describedby wired onto the child automatically
 *  - required marked visually AND semantically
 *
 * InputGroup adds prefix/suffix addons for the units this app lives in:
 * €, kWh, kWp, MPRN, Eircode.
 */
import { Children, ReactElement, ReactNode, cloneElement, isValidElement, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, required, helper, error, className, children }: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const descId = `${id}-desc`;

  // Wire aria onto the first form control child
  const wired = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<Record<string, unknown>>;
    return cloneElement(el, {
      id: (el.props.id as string) ?? id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': helper || error ? descId : undefined,
      'aria-required': required || undefined,
    });
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden className="text-destructive ml-0.5">*</span>}
      </Label>
      {wired}
      {error ? (
        <p id={descId} role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : helper ? (
        <p id={descId} className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

/** Prefix/suffix addons — € / kWh / kWp / MPRN patterns. */
interface InputGroupProps {
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function InputGroup({ prefix, suffix, className, children }: InputGroupProps) {
  return (
    <div
      className={cn(
        'flex h-control w-full items-stretch rounded-control border border-input bg-background',
        'transition-colors duration-instant hover:border-muted-foreground/40',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25',
        className,
      )}
    >
      {prefix != null && (
        <span className="flex items-center px-3 text-sm text-muted-foreground border-r border-input bg-muted/40 rounded-l-control select-none">
          {prefix}
        </span>
      )}
      <div className="flex-1 [&>input]:h-full [&>input]:border-0 [&>input]:rounded-none [&>input]:focus-visible:ring-0 [&>input]:focus-visible:border-transparent [&>input]:bg-transparent">
        {children}
      </div>
      {suffix != null && (
        <span className="flex items-center px-3 text-sm text-muted-foreground border-l border-input bg-muted/40 rounded-r-control select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Two-column form row that collapses on mobile — the Cal.com settings layout. */
export function FieldRow({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}
