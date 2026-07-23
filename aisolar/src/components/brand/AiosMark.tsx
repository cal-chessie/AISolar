/**
 * AIOS / AISolar brand marks.
 *
 * Three marks, all the SAME shape — a charcoal ROUNDED SQUARE (an iOS-style
 * squircle, ~26% corner radius so it reads as a rounded square at every size,
 * never a circle). White ink.
 *
 *   BrandMark      — the infinity glyph in a tile. The app mark. Used sparingly:
 *                    once in a header, as favicon, as a loading motif. Not
 *                    scattered.
 *   AiosWordmark   — "AIOS" wordmark tile (the parent brand).
 *   AisolarWordmark— "AISolar" wordmark tile (the product).
 *
 * These are hand-built (clean vector + type), not the raw AI-generated raster
 * icons — no sparkle artifacts, crisp at any scale.
 */
import { cn } from '@/lib/utils';

/** Shared squircle tile. Corner radius is a PERCENTAGE so it scales with size
 *  and always looks like a rounded square, not a circle. */
function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-grid place-items-center bg-primary text-primary-foreground overflow-hidden',
        'rounded-[26%]',
        className,
      )}
    >
      {children}
    </span>
  );
}

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

/** The app mark: infinity in a charcoal squircle. Use sparingly. */
export function BrandMark({ className, glyphClassName, label = 'AISolar' }: {
  className?: string; glyphClassName?: string; label?: string;
}) {
  return (
    <Tile className={className}>
      <AiosGlyph className={cn('w-[72%] h-[72%]', glyphClassName)} />
      <span className="sr-only">{label}</span>
    </Tile>
  );
}

/** Wordmark tile — bold white type on the charcoal squircle, drawn as SVG so it
 *  scales perfectly at any tile size. Best at md+ (auth hero, footer, marketing)
 *  where the word is legible. */
type Word = 'AIOS' | 'AISolar' | 'AITeam' | 'AIChat';
const WORD_SIZE: Record<Word, number> = { AIOS: 36, AISolar: 25, AITeam: 27, AIChat: 27 };

export function Wordmark({ word, className }: { word: Word; className?: string }) {
  return (
    <Tile className={className}>
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        <text
          x="50" y="52" dominantBaseline="central" textAnchor="middle"
          fill="currentColor"
          fontSize={WORD_SIZE[word]}
          fontWeight={700}
          letterSpacing={word === 'AIOS' ? -0.5 : -0.3}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {word}
        </text>
      </svg>
      <span className="sr-only">{word}</span>
    </Tile>
  );
}

export const AiosWordmark = ({ className }: { className?: string }) => <Wordmark word="AIOS" className={className} />;
export const AisolarWordmark = ({ className }: { className?: string }) => <Wordmark word="AISolar" className={className} />;
export const AiteamWordmark = ({ className }: { className?: string }) => <Wordmark word="AITeam" className={className} />;
export const AichatWordmark = ({ className }: { className?: string }) => <Wordmark word="AIChat" className={className} />;

/**
 * In-app header mark. Cal: the infinity "isn't doing it" inside the app — use
 * the AIOS logo there. So every cockpit header (which imports AiosMark) now
 * shows the AIOS wordmark tile. The infinity BrandMark stays reserved for
 * favicon / sparing motif use only.
 */
export function AiosMark({ className }: { className?: string; glyphClassName?: string }) {
  return <Wordmark word="AIOS" className={className} />;
}
