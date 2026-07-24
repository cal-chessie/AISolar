/**
 * DocumentActions — the footer of every document the consultant reviews.
 *
 * Cal replaced the redundant Print PDF / Download tabs with two things that
 * actually move a deal:
 *   • Notify customer — a manual snapshot of where they are right now, ready
 *     to send (draft-first, goes with the consultant's approval).
 *   • Consultant Intelligence — ask what the holdup is for THIS client; get the
 *     bottleneck, who the ball is with, and the next action, plus a one-click
 *     "update the customer".
 *
 * Nothing auto-sends (house rule: draft-first). The intelligence is derived
 * from the lead's real stage — see leadIntel().
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Brain, Send, ArrowRight, Clock, CircleDot, MessageSquarePlus } from 'lucide-react';
import { leadIntel, waitingLabel } from '@/lib/consultantIntelligence';
import type { DummyLead } from '@/lib/dummyData';

export default function DocumentActions({
  lead,
  forwardLabel,
  forwardIcon: ForwardIcon,
  onForward,
}: {
  lead: DummyLead;
  forwardLabel: string;
  forwardIcon: typeof ArrowRight;
  onForward?: () => void;
}) {
  const [panel, setPanel] = useState<'none' | 'notify' | 'intel'>('none');
  const intel = leadIntel(lead);
  const first = lead.name.split(' ')[0];

  const sendUpdate = () => {
    toast.success(`Update drafted for ${first}`, {
      description: 'Queued to send with your approval — nothing goes out automatically.',
    });
    setPanel('none');
  };

  return (
    <div className="space-y-2">
      {/* Expanded panel sits ABOVE the buttons so the doc stays in view */}
      {panel === 'notify' && (
        <div className="rounded-control border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <MessageSquarePlus className="size-3.5 text-primary" /> Snapshot for {first} — {intel.stageLabel}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed bg-background rounded-control p-2.5 border border-border">
            {intel.customerUpdate}
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setPanel('none')}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs" onClick={sendUpdate}><Send className="size-3.5 mr-1.5" /> Send update</Button>
          </div>
        </div>
      )}

      {panel === 'intel' && (
        <div className="rounded-control border border-border bg-muted/30 p-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Brain className="size-3.5 text-primary" /> Consultant Intelligence
          </div>
          <div className="grid gap-2 text-xs">
            <div className="flex items-start gap-2">
              <CircleDot className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span><span className="text-muted-foreground">Holdup:</span> {intel.holdup}</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className={`size-3.5 mt-0.5 shrink-0 ${intel.isStale ? 'text-doc-proposal' : 'text-muted-foreground'}`} />
              <span>
                <span className="text-muted-foreground">Ball is with</span> {waitingLabel(intel.waitingOn)} ·{' '}
                {intel.daysSinceContact === 0 ? 'contacted today' : `${intel.daysSinceContact} day${intel.daysSinceContact === 1 ? '' : 's'} since last contact`}
                {intel.isStale && <span className="ml-1 font-semibold text-doc-proposal">— stale, on your side</span>}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="size-3.5 mt-0.5 text-primary shrink-0" />
              <span><span className="text-muted-foreground">Next:</span> <span className="font-medium">{intel.nextAction}</span></span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-0.5">
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setPanel('none')}>Close</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setPanel('notify')}>
              <MessageSquarePlus className="size-3.5 mr-1.5" /> Update the customer
            </Button>
          </div>
        </div>
      )}

      {/* The three actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-10 rounded-control"
          onClick={() => setPanel(p => p === 'intel' ? 'none' : 'intel')}>
          <Brain className="h-4 w-4 mr-2" /> Intelligence
        </Button>
        <Button variant="outline" className="flex-1 h-10 rounded-control"
          onClick={() => setPanel(p => p === 'notify' ? 'none' : 'notify')}>
          <Send className="h-4 w-4 mr-2" /> Notify customer
        </Button>
        {onForward && (
          <Button onClick={onForward} className="flex-1 h-10 rounded-control font-semibold">
            <ForwardIcon className="h-4 w-4 mr-2" /> {forwardLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
