/**
 * roofRead — the client half of Survey-Photo Intelligence. Sends a roof photo
 * to `analyse-roof-photo`; the vision model reads orientation, pitch, shading
 * and obstructions so the surveyor can confirm-not-retype and the design is
 * never built for a roof that isn't there. It SUGGESTS; the human confirms.
 */
import { supabase } from '@/integrations/supabase/client';

export interface RoofRead {
  orientation?: string;
  pitch_estimate?: string;
  shading?: 'none' | 'light' | 'moderate' | 'heavy' | string;
  obstructions?: string[];
  note?: string;
}

export interface RoofReadResult {
  status: 'ok' | 'unreadable' | 'no_ai' | 'error';
  read: RoofRead;
}

const clean = (v?: string) => (v && v !== 'unreadable' ? v : undefined);

export async function analyseRoofPhoto(imageDataUrl: string): Promise<RoofReadResult> {
  try {
    const { data, error } = await supabase.functions.invoke('analyse-roof-photo', { body: { imageDataUrl } });
    if (error || !data) return { status: 'error', read: {} };
    const r = data.read ?? {};
    // Normalise: drop "unreadable" scalars so the UI shows only real reads.
    return {
      status: data.status,
      read: {
        orientation: clean(r.orientation),
        pitch_estimate: clean(r.pitch_estimate),
        shading: clean(r.shading),
        obstructions: Array.isArray(r.obstructions) ? r.obstructions.filter(Boolean) : [],
        note: clean(r.note),
      },
    };
  } catch {
    return { status: 'error', read: {} };
  }
}
