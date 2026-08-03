/**
 * artefactCheck — the client half of Compliance Vision.
 *
 * Sends a captured cert/photo + what the installer TYPED to the
 * `verify-artefact` edge function; the vision model reads the document and
 * reports any disagreement. The AI flags, the human decides — a mismatch never
 * blocks the gate, it makes the human look twice at the exact field, which is
 * the entire point.
 */
import { supabase } from '@/integrations/supabase/client';
import type { SerialState } from '@/lib/fieldRecord';

export type ArtefactKind = 'type_test' | 'plate' | 'reci' | 'sld';

export interface ArtefactVerdict {
  status: 'ok' | 'mismatch' | 'unreadable' | 'no_ai' | 'error';
  extracted: Record<string, string>;
  mismatches: Array<{ field: string; typed: string; read: string }>;
}

/** Human names for mismatch fields — shown on the gate card. */
export const FIELD_LABELS: Record<string, string> = {
  fittedModel: 'Fitted model',
  acRatingKw: 'AC rating (kW)',
  ratedCurrentA: 'Rated current (A)',
  typeTestCertRef: 'Type-test cert ref',
  serial: 'Serial number',
  reciNumber: 'RECI number',
};

export async function verifyArtefact(
  artefact: ArtefactKind,
  imageDataUrl: string,
  serials: Pick<SerialState, 'fittedModel' | 'acRatingKw' | 'ratedCurrentA' | 'typeTestCertRef' | 'serial'>,
  /** The RECI number from Settings — the RECI-cert check compares against it. */
  reciNumber?: string,
): Promise<ArtefactVerdict> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-artefact', {
      body: {
        artefact,
        imageDataUrl,
        typed: {
          fittedModel: serials.fittedModel,
          acRatingKw: serials.acRatingKw,
          ratedCurrentA: serials.ratedCurrentA,
          typeTestCertRef: serials.typeTestCertRef,
          serial: serials.serial,
          reciNumber: reciNumber ?? '',
        },
      },
    });
    if (error || !data) return { status: 'error', extracted: {}, mismatches: [] };
    return data as ArtefactVerdict;
  } catch {
    return { status: 'error', extracted: {}, mismatches: [] };
  }
}
