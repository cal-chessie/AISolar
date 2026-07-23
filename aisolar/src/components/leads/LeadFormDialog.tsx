/**
 * LeadFormDialog — add a lead by hand, or edit one.
 *
 * Cal: "cant we add a lead too right? and edit a lead?" — the CRM is not a
 * CRM if the consultant can't type a name in. Add mode creates a manual-source
 * lead at stage "new"; edit mode patches the contact + bill basics in place.
 * Demo mode keeps it in local state; live mode is wired at launch.
 */
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Pencil, Camera, FileText, X } from 'lucide-react';
import type { DummyLead } from '@/lib/dummyData';

export interface LeadFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  monthly_bill: number;
  annual_kwh: number;
  /** Cal: snap the electric bill right on add — a capture event on the lead.
   *  At launch this posts to extract-bill-data (same door as /start). */
  billFile?: File | null;
}

export function leadFromForm(v: LeadFormValues): DummyLead {
  const now = new Date().toISOString();
  return {
    id: `lead-local-${Date.now()}`,
    name: v.name,
    email: v.email,
    phone: v.phone,
    address: v.address,
    mprn: '',
    monthly_bill: v.monthly_bill,
    annual_kwh: v.annual_kwh,
    workflow_stage: 'new',
    status: 'active',
    source: v.billFile ? 'bill_upload' : 'manual',
    score: v.billFile ? 60 : 50,
    assigned_consultant: 'You',
    intake: { extraction_confidence: 'low' } as DummyLead['intake'],
    touchpoints: [
      {
        stage: 'new', channel: 'portal', direction: 'outbound',
        summary: 'Lead added manually', timestamp: now, actor: 'consultant',
      },
      ...(v.billFile ? [{
        stage: 'new', channel: 'portal', direction: 'inbound',
        summary: `Bill captured (${v.billFile.name}) — 21-point extraction queued`,
        timestamp: now, actor: 'consultant' as const,
      }] : []),
    ],
  } as DummyLead;
}

export default function LeadFormDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: DummyLead | null;           // present = edit mode
  onSave: (values: LeadFormValues) => void;
}) {
  const editing = !!initial;
  const [v, setV] = useState<LeadFormValues>({ name: '', email: '', phone: '', address: '', monthly_bill: 0, annual_kwh: 0, billFile: null });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setV(initial
        ? { name: initial.name, email: initial.email, phone: initial.phone, address: initial.address, monthly_bill: initial.monthly_bill, annual_kwh: initial.annual_kwh, billFile: null }
        : { name: '', email: '', phone: '', address: '', monthly_bill: 0, annual_kwh: 0, billFile: null });
    }
  }, [open, initial]);

  const set = (k: keyof LeadFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV(s => ({ ...s, [k]: k === 'monthly_bill' || k === 'annual_kwh' ? Number(e.target.value) : e.target.value }));

  const valid = v.name.trim().length > 1 && (v.email.includes('@') || v.phone.trim().length > 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[16px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? <Pencil className="size-4" /> : <UserPlus className="size-4" />}
            {editing ? `Edit ${initial!.name.split(' ')[0]}'s details` : 'Add a lead'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Changes apply everywhere this lead appears.'
              : 'Name plus an email or phone is enough — the bill can come later.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="lf-name">Full name *</Label>
            <Input id="lf-name" value={v.name} onChange={set('name')} placeholder="Mary O'Brien" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lf-email">Email</Label>
              <Input id="lf-email" type="email" value={v.email} onChange={set('email')} placeholder="mary@example.ie" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="lf-phone">Phone</Label>
              <Input id="lf-phone" type="tel" value={v.phone} onChange={set('phone')} placeholder="+353 87 123 4567" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="lf-address">Address</Label>
            <Input id="lf-address" value={v.address} onChange={set('address')} placeholder="12 Beech Hill Road, Dublin 4" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lf-bill">Monthly bill (€)</Label>
              <Input id="lf-bill" type="number" value={v.monthly_bill || ''} onChange={set('monthly_bill')} placeholder="245" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="lf-kwh">Annual usage (kWh)</Label>
              <Input id="lf-kwh" type="number" value={v.annual_kwh || ''} onChange={set('annual_kwh')} placeholder="8400" className="mt-1.5" />
            </div>
          </div>

          {/* Cal: snap the bill right here — the capture event that starts the
              21-point read. Camera on mobile (capture=environment), file
              picker on desktop. Optional; skipping never blocks the add. */}
          {!editing && (
            <div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment"
                className="hidden" onChange={e => setV(s => ({ ...s, billFile: e.target.files?.[0] ?? null }))} />
              {v.billFile ? (
                <div className="flex items-center gap-2 rounded-[10px] border border-doc-deposit/40 bg-doc-deposit/5 px-3 py-2.5">
                  <FileText className="size-4 text-doc-deposit shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{v.billFile.name}</span>
                  <span className="text-2xs text-doc-deposit font-medium shrink-0">bill captured</span>
                  <button type="button" aria-label="Remove bill" onClick={() => { setV(s => ({ ...s, billFile: null })); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors">
                  <Camera className="size-4" /> Snap or upload the electricity bill
                </button>
              )}
              <p className="text-2xs text-muted-foreground mt-1">The bill starts the 21-point read — the estimate builds itself from it.</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={() => { onSave(v); onOpenChange(false); }}>
            {editing ? 'Save changes' : 'Add lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
