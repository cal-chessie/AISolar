/**
 * MapPanel — an embedded route/location map that opens to a full-screen view.
 * Shared by the consultant Route and the installer Map/Today so "click the
 * map for a better look" works the same everywhere (Cal, 28 Jul).
 */
import { useEffect, useState } from 'react';
import { Maximize2, X, Navigation } from 'lucide-react';

export default function MapPanel({ embedSrc, fullRouteUrl, aspect = 'aspect-[16/10]', className = '' }: {
  embedSrc: string;
  fullRouteUrl?: string;
  aspect?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className={`relative rounded-panel bg-card shadow-card overflow-hidden group ${className}`}>
        <div className={`${aspect} bg-muted`}>
          <iframe title="Route map" src={embedSrc} className="w-full h-full border-0" loading="lazy" />
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Expand map"
          className="absolute top-2 right-2 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-control bg-background/90 backdrop-blur border border-border text-xs font-medium shadow-card hover:bg-background transition-colors">
          <Maximize2 className="h-3.5 w-3.5" /> Bigger view
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6 flex flex-col" role="dialog" aria-modal="true" aria-label="Full route map" onClick={() => setOpen(false)}>
          <div className="flex-1 rounded-panel overflow-hidden bg-card shadow-card flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-3 h-12 border-b shrink-0">
              <span className="text-sm font-semibold">Route map</span>
              {fullRouteUrl && (
                <a href={fullRouteUrl} target="_blank" rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-control bg-tech px-3 text-xs font-semibold text-white hover:bg-tech/90 transition-colors">
                  <Navigation className="h-3.5 w-3.5" /> Open in Google Maps
                </a>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close map" className="ml-auto size-9 grid place-items-center rounded-control hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe title="Full route map" src={embedSrc} className="w-full flex-1 border-0" loading="lazy" />
          </div>
        </div>
      )}
    </>
  );
}
