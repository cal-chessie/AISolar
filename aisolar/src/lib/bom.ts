/**
 * bom — the ONE bill-of-materials for an install (what to load for THIS job).
 *
 * Lifted out of ClientHub (29 Jul) so the client hub, the AI Coach ("what do I
 * load?"), Routing's van load-out, and the Owner's depot shelf all read the SAME
 * source — no screen re-deriving a different list. One design → one BOM.
 */
import type { DummyLead } from '@/lib/dummyData';

export interface BomLine { category: string; item: string; qty: number; critical: boolean }

/** The job's bill of materials, derived from the proposal. Critical = the job
 *  can't happen without it (panels, inverter, battery, mounting, cable, safety). */
export function computeBOM(lead: DummyLead): BomLine[] {
  const p = lead.proposal;
  if (!p) return [];
  const battery = p.battery_model
    ? [{ category: 'Battery', item: p.battery_model, qty: 1, critical: true }]
    : [];
  return [
    { category: 'Panels', item: `${p.panel_count} × ${p.panel_model}`, qty: p.panel_count, critical: true },
    { category: 'Inverter', item: p.inverter_model, qty: 1, critical: true },
    ...battery,
    { category: 'Mounting', item: 'Rails + hooks + clamps', qty: Math.ceil(p.panel_count * 0.3), critical: true },
    { category: 'Electrical', item: 'DC cable (6mm²)', qty: Math.ceil(8 + p.panel_count * 1.2), critical: true },
    { category: 'Electrical', item: 'AC cable + isolators + SPD', qty: 4, critical: true },
    { category: 'Safety', item: 'Harness + edge protection', qty: 2, critical: true },
  ];
}
