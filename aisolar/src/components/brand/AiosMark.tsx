/**
 * AIOS infinity mark.
 *
 * The parent brand's glyph: a lemniscate (∞) drawn as a single stroked path
 * with round caps, so it reads clean at any size and inherits currentColor —
 * white on a charcoal tile, charcoal on white. The loops are drawn tall so the
 * glyph fills a square tile rather than floating in a band of background.
 */
import { cn } from '@/lib/utils';

export function AiosGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 46 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('w-full h-full', className)}
      aria-hidden="true"
    >
      <path d="M23 14 C23 5 7 5 7 14 C7 23 23 23 23 14 C23 5 39 5 39 14 C39 23 23 23 23 14 Z" />
    </svg>
  );
}

/**
 * The full lockup: charcoal rounded tile with the white infinity, like the
 * AIOS app icon. The glyph fills ~82% of the tile so the mark reads bold, not
 * lost in padding.
 */
export function AiosMark({ className, glyphClassName }: { className?: string; glyphClassName?: string }) {
  return (
    <span className={cn('inline-grid place-items-center rounded-lg bg-primary text-primary-foreground', className)}>
      <AiosGlyph className={cn('w-[82%] h-[82%]', glyphClassName)} />
    </span>
  );
}
