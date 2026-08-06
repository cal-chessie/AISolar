/**
 * installPhotos — the installer's field-photo upload (2C, 5 Aug).
 *
 * JobViewV2's photo checklist used to just toggle a boolean ("uploaded: true")
 * with no actual file. This uploads the real photo to the `project-documents`
 * bucket, at a path that STARTS WITH the lead id — because the storage RLS is
 * tenant-scoped on `own_lead((storage.foldername(name))[1])` (fixed this
 * session), so only the lead's tenant staff can write/read it.
 *
 * Demo-safe: in the sample sandbox there's no real write — it resolves ok so the
 * checklist still ticks, but nothing lands in a real bucket.
 */
import { supabase } from '@/integrations/supabase/client';
import { isDemoMode } from './demoMode';

export interface InstallPhotoResult { ok: boolean; path?: string; reason?: string }

export async function uploadInstallPhoto(leadId: string, photoId: string, file: File): Promise<InstallPhotoResult> {
  if (isDemoMode()) return { ok: true, path: `demo/${photoId}`, reason: 'demo' }; // sandbox — no real write
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    // The first path segment MUST be the lead id — the bucket RLS scopes on it.
    const path = `${leadId}/install/${photoId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('project-documents').upload(path, file, {
      upsert: true, contentType: file.type || 'image/jpeg',
    });
    if (error) { console.warn('[installPhotos] upload', error.message); return { ok: false, reason: error.message }; }
    return { ok: true, path };
  } catch (e) {
    console.warn('[installPhotos] threw', e);
    return { ok: false, reason: (e as Error).message };
  }
}
