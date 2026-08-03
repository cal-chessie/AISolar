/**
 * SectionBanner — ONE banner shape for every agent sub-tab.
 *
 * Cal (3 Aug): "I asked for the 3 sub tabs to be symmetry… they're screaming at
 * each other." They were: Agent Foundation had a rich Card banner (icon + title
 * + demo flag + one-liner + KPI row), Agent Training had a bare `h2`, AI Config
 * had none. Three different voices in the same section.
 *
 * This is Foundation's banner — the best of the three — lifted into a component
 * the other two adopt, so switching sub-tabs feels like ONE screen changing its
 * content, not three apps arguing. Structure is fixed; only the words, the icon
 * and the (optional) stat row change:
 *
 *   [icon] TITLE  [flag]        [ up to 4 stats, right-aligned ]
 *   one plain-English line: what this is FOR, in the owner's language
 */
import { ReactNode } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SectionBannerProps {
  icon: ReactNode;
  title: string;
  /** One line, plain English: what this page is for. No jargon. */
  description: string;
  /** Honest flag (e.g. "Demo data") — never invented, only when it's true. */
  flag?: string;
  /** Up to 4 <BannerStat>s; omit entirely on pages with nothing true to count. */
  stats?: ReactNode;
  className?: string;
}

export function SectionBanner({ icon, title, description, flag, stats, className }: SectionBannerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-md font-semibold flex items-center gap-2">
              <span className="[&>svg]:size-5 [&>svg]:text-primary shrink-0">{icon}</span>
              <span className="truncate">{title}</span>
              {flag && (
                <Badge variant="outline" className="text-[11px] bg-tech/10 text-tech border-tech/30 shrink-0">
                  {flag}
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-prose leading-body">{description}</p>
          </div>
          {stats && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">{stats}</div>}
        </div>
      </CardHeader>
    </Card>
  );
}

/** One stat in the banner's right-hand row — same shape everywhere. */
export function BannerStat({ icon, value, label, tone = 'muted' }: {
  icon: ReactNode; value: string; label: string;
  tone?: 'tech' | 'proposal' | 'pop' | 'deposit' | 'muted';
}) {
  const toneClass = {
    tech: 'text-tech', proposal: 'text-doc-proposal', pop: 'text-pop',
    deposit: 'text-doc-deposit', muted: 'text-muted-foreground',
  }[tone];
  return (
    <div className="rounded-control border border-border bg-muted/30 px-3 py-2 min-w-[5.5rem]">
      <div className="flex items-center gap-1.5">
        <span className={cn('[&>svg]:size-3.5', toneClass)}>{icon}</span>
        <span className={cn('text-lg font-semibold tabular-nums leading-none', toneClass)}>{value}</span>
      </div>
      <div className="text-2xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
