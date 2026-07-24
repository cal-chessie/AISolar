/**
 * EngagementBadge — the "opened 4×" chip, droppable on any surface a lead
 * appears (Cal wants the view-signal everywhere). Colour = warmth:
 *   hot  (3+ opens)   — a customer this keen is your next call
 *   warm (1–2 opens)  — engaged, worth a nudge
 *   cold (sent, 0)    — sent but ignored; chase or re-frame
 *   none (not sent)   — nothing to show, badge hides itself
 *
 * `compact` renders just the eye + count for dense rows; full renders the
 * signal line ("Opened 4× · last 6h ago").
 */
import { Eye, EyeOff } from 'lucide-react';
import { leadEngagement, type Warmth } from '@/lib/engagement';
import type { DummyLead } from '@/lib/dummyData';

const TONE: Record<Warmth, string> = {
  hot: 'bg-pop/10 text-pop',
  warm: 'bg-doc-proposal-subtle text-doc-proposal',
  cold: 'bg-muted text-muted-foreground',
  none: '',
};

export default function EngagementBadge({ lead, compact = false }: { lead: DummyLead; compact?: boolean }) {
  const e = leadEngagement(lead);
  if (e.warmth === 'none') return null;   // nothing sent yet → nothing to say

  const Icon = e.views > 0 ? Eye : EyeOff;
  const tone = TONE[e.warmth];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-2xs font-semibold ${tone}`}
        title={e.signal}>
        <Icon className="size-3" /> {e.views > 0 ? `${e.views}×` : '0'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-2xs font-medium ${tone}`}>
      <Icon className="size-3.5" /> {e.signal}
    </span>
  );
}
