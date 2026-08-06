import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { flushPendingFieldRecords } from '@/lib/fieldRecord';

/**
 * OfflineIndicator — honest connectivity awareness for field crews (and everyone)
 * on poor signal. When the browser goes offline it shows a thin, reassuring strip
 * ("your work is saved and will sync"); when it comes back it flushes the
 * field-record sync queue so the commissioning gate lands in the DB right away.
 *
 * NO service worker: this app deliberately ships a SW kill-switch (see
 * public/sw.js — a cache-first SW once served stale JS bundles and crashed the app
 * daily). This is pure `navigator.onLine` awareness + write-durability, so it
 * can't reintroduce that failure mode. Cold-start-while-offline (opening the app
 * with zero signal) is a separate, deliberate SW decision left to Cal.
 */
export default function OfflineIndicator() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      void flushPendingFieldRecords(); // sync anything captured while offline
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-3 z-[60] mx-auto flex w-fit max-w-[92vw] items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-lg"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>You're offline — your work is saved on this device and will sync when you're back.</span>
    </div>
  );
}
