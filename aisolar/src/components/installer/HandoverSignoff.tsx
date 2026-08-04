/**
 * HandoverSignoff — both parties sign off the handover. eIDAS "simple electronic
 * signature": the typed name IS the signature (backed by the handover event),
 * and it prints straight onto the Declaration of Works. Self-contained: reads +
 * writes the offline-first field record directly, so it needs no wiring through
 * the job view.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2, PenLine, HardHat, Home } from 'lucide-react';
import type { DummyLead } from '@/lib/dummyData';
import { getFieldRecord, setHandoverSignoff, type HandoverSignoff as Signoff } from '@/lib/fieldRecord';

export default function HandoverSignoff({ lead }: { lead: DummyLead }) {
  const [ho, setHo] = useState<Signoff>(() => getFieldRecord(lead.id)?.handover ?? {});
  const [installer, setInstaller] = useState(ho.installerName ?? lead.assignment?.installer_name ?? '');
  const [homeowner, setHomeowner] = useState(ho.homeownerName ?? lead.name ?? '');

  useEffect(() => {
    const update = (e: Event) => {
      if ((e as CustomEvent).detail?.leadId && (e as CustomEvent).detail.leadId !== lead.id) return;
      setHo(getFieldRecord(lead.id)?.handover ?? {});
    };
    window.addEventListener('field-record-changed', update);
    return () => window.removeEventListener('field-record-changed', update);
  }, [lead.id]);

  const sign = (who: 'installer' | 'homeowner', name: string) => {
    const n = name.trim();
    if (!n) return;
    const next: Partial<Signoff> = who === 'installer' ? { installerName: n } : { homeownerName: n };
    const both = who === 'installer' ? (n && (ho.homeownerName ?? homeowner).trim()) : ((ho.installerName ?? installer).trim() && n);
    if (both) next.signedAt = new Date().toISOString();
    setHandoverSignoff(lead.id, next);
    setHo(p => ({ ...p, ...next }));
    toast.success(`${who === 'installer' ? 'Installer' : 'Homeowner'} signed`, { description: 'Prints onto the Declaration of Works.' });
  };

  const Row = ({ who, icon: Icon, label, name, setName, signed }: {
    who: 'installer' | 'homeowner'; icon: typeof HardHat; label: string; name: string; setName: (v: string) => void; signed?: string;
  }) => (
    <div className="flex items-end gap-2">
      <div className="flex-1 min-w-0">
        <Label className="text-2xs text-muted-foreground flex items-center gap-1"><Icon className="size-3" /> {label}</Label>
        {signed ? (
          <div className="mt-1 h-9 flex items-center gap-1.5 text-sm">
            <span className="font-semibold" style={{ fontFamily: 'cursive' }}>{signed}</span>
            <CheckCircle2 className="size-3.5 text-doc-deposit" />
          </div>
        ) : (
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="full name" className="mt-1 h-9 text-sm" />
        )}
      </div>
      {!signed && (
        <Button size="sm" variant="outline" className="h-9 text-xs shrink-0" disabled={!name.trim()} onClick={() => sign(who, name)}>
          <PenLine className="size-3.5 mr-1" /> Sign
        </Button>
      )}
    </div>
  );

  const bothSigned = !!ho.installerName && !!ho.homeownerName;

  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2"><PenLine className="size-4 text-doc-deposit" /> Handover sign-off</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Both parties sign — the names print onto the Declaration of Works (SEAI) as the signature.</p>
      <div className="mt-3 space-y-3">
        <Row who="installer" icon={HardHat} label="Registered installer" name={installer} setName={setInstaller} signed={ho.installerName} />
        <Row who="homeowner" icon={Home} label="Homeowner" name={homeowner} setName={setHomeowner} signed={ho.homeownerName} />
      </div>
      {bothSigned && (
        <p className="mt-3 text-2xs text-doc-deposit flex items-center gap-1"><CheckCircle2 className="size-3" /> Both parties signed{ho.signedAt ? ` · ${new Date(ho.signedAt).toLocaleDateString('en-IE')}` : ''} — on the DoW + any SEAI form.</p>
      )}
    </div>
  );
}
