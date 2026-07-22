/**
 * AIOS infinity mark.
 *
 * The parent brand's glyph: a lemniscate (∞) drawn as a single stroked path
 * with round caps, so it reads clean at any size and inherits currentColor —
 * white on a charcoal tile, charcoal on white. Two loops crossing at centre,
 * matching the AIOS logo Cal supplied.
 */
import { cn } from '@/lib/utils';

export function AiosGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('w-full h-full', className)}
      aria-hidden="true"
    >
      <path d="M24 12 C24 4.5 8.5 4.5 8.5 12 C8.5 19.5 24 19.5 24 12 C24 4.5 39.5 4.5 39.5 12 C39.5 19.5 24 19.5 24 12 Z" />
    </svg>
  );
}

/**
 * The full lockup: charcoal rounded tile with the white infinity, like the
 * AIOS app icon. `size` is the tile edge in px-equivalent Tailwind size.
 */
export function AiosMark({ className, glyphClassName }: { className?: string; glyphClassName?: string }) {
  return (
    <span className={cn('inline-grid place-items-center rounded-lg bg-primary text-primary-foreground', className)}>
      <AiosGlyph className={cn('w-[62%] h-[62%]', glyphClassName)} />
    </span>
  );
}
