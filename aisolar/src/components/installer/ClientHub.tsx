/**
 * ClientHub — the ONE place a client is ever shown in AIField.
 *
 * The anti-duplication keystone (Cal, 28 Jul IA): not a job-card here, a row
 * there, a profile elsewhere — ONE surface, reached from Today and Schedule.
 * Profile · BOM (what to load, this job's materials) · Message · START.
 * Start begins the install (JobViewV2) — the moat. Materials the-tab dissolved
 * INTO here (the job BOM lives with the client); the depot load-out lives on
 * Routing; ordering/shelf is the Owner's.
 *
 * Installer = installs only (no surveys — those are the consultant's).
 * Skills: ui-ux-pro-max (family tokens, one purpose), stop-slop.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Navigation, MessageSquare, Play, Package, Sun, CheckCircle2, MapPin } from 'lucide-react';
import type { DummyLead } from '@/lib/dummyData';
import { computeBOM } from '@/lib/bom';

const navUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

export default function ClientHub({ lead, onStart, onMessage, dateLabel }: {
  lead: DummyLead;
  onStart: () => void;
  onMessage: () => void;
  /** e.g. "today", "Fri 31 Jul" — the install day, shown in the header */
  dateLabel?: string;
}) {
  const p = lead.proposal;
  const bom = computeBOM(lead);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const first = lead.name.split(' ')[0];

  return (
    <div className="space-y-4">
      {/* profile */}
      <div className="rounded-panel bg-card shadow-card p-4">
        {/* min-w-0 + shrink-0 on the avatar: without it the row refused to
            shrink and the address/MPRN were CLIPPED off-screen at 375px
            (found on the 3 Aug mobile pass). */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-11 w-11 shrink-0"><AvatarFallback>{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-bold truncate">{lead.name}</div>
            <div className="text-sm text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /> {lead.address}</div>
          </div>
          {dateLabel && <Badge variant="outline" className="shrink-0">{dateLabel}</Badge>}
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Phone</div><div className="font-medium">{lead.phone}</div></div>
          <div><div className="text-xs text-muted-foreground">MPRN</div><div className="font-medium font-mono text-xs">{lead.mprn}</div></div>
          {p && <div><div className="text-xs text-muted-foreground">System</div><div className="font-medium">{p.system_size_kw} kWp · {p.panel_count} panels</div></div>}
          {p?.battery_model && <div><div className="text-xs text-muted-foreground">Battery</div><div className="font-medium truncate">{p.battery_model}</div></div>}
        </div>
        {/* the actions — Start is the point; message + navigate + call ride along */}
        <div className="mt-4 flex items-center gap-2">
          <Button className="flex-1 h-11 bg-primary text-primary-foreground hover:opacity-90" onClick={onStart}>
            <Play className="h-4 w-4 mr-1.5" /> Start the install
          </Button>
          <button onClick={onMessage} aria-label="Message" className="size-11 grid place-items-center rounded-control border border-border hover:bg-muted transition-colors shrink-0">
            <MessageSquare className="h-4 w-4" />
          </button>
          <a href={navUrl(lead.address)} target="_blank" rel="noreferrer" aria-label="Navigate" className="size-11 grid place-items-center rounded-control border border-border hover:bg-muted transition-colors shrink-0">
            <Navigation className="h-4 w-4 text-tech" />
          </a>
          <a href={`tel:${lead.phone ?? ''}`} aria-label="Call" className="size-11 grid place-items-center rounded-control border border-border hover:bg-muted transition-colors shrink-0">
            <Phone className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* BOM — this job's materials, checked off as you load the van */}
      {bom.length > 0 && (
        <div className="rounded-panel bg-card shadow-card overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Package className="h-4 w-4 text-tech" />
            <h3 className="font-semibold text-sm">What to load — {first}'s gear</h3>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{loaded.size}/{bom.length} loaded</span>
          </div>
          <div className="p-2 space-y-1">
            {bom.map((b, i) => {
              const on = loaded.has(i);
              return (
                <button key={i} onClick={() => setLoaded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-control border text-left text-sm transition-colors ${on ? 'border-doc-deposit/40 bg-doc-deposit/5' : 'border-border hover:bg-muted/50'}`}>
                  {on ? <CheckCircle2 className="size-4 text-doc-deposit shrink-0" /> : <span className="size-4 rounded-full border border-muted-foreground/40 shrink-0" />}
                  <Badge variant="outline" className="text-[11px] shrink-0">{b.category}</Badge>
                  <span className={`flex-1 min-w-0 truncate ${on ? 'text-muted-foreground line-through' : ''}`}>{b.qty} × {b.item}</span>
                  {b.critical && !on && <Badge variant="outline" className="text-[11px] bg-pop/10 text-pop border-pop/30 shrink-0">Critical</Badge>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!p && (
        <div className="rounded-panel bg-card shadow-card p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Sun className="h-4 w-4" /> No design on file yet — the BOM appears once the proposal is set.
        </div>
      )}
    </div>
  );
}
