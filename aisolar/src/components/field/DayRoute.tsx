/**
 * DayRoute — a day's stops, sequenced into the shortest real loop.
 *
 * Where routing EARNS its weight: the consultant doing 3+ surveys in a day
 * (Cal, 28 Jul). Installs are one-a-day missions — routing has no weight
 * there; the installer view becomes month-ahead scheduling instead. So this
 * lives on the consultant screen, between Today and their survey work.
 *
 * The solve is real (see lib/routeOptimize): nearest-neighbour + 2-opt over
 * real positions, open path (leave from base, no forced return). The saved
 * figure is COMPUTED or absent — never a slogan. Desktop-aware: map + list
 * sit side by side; mobile stacks. Skills used: design tokens, stop-slop.
 */
import { Navigation, ChevronRight, Route as RouteIcon } from 'lucide-react';
import { optimiseRoute, coordsForAddress, type GeoPoint } from '@/lib/routeOptimize';
import MapPanel from '@/components/field/MapPanel';

export interface RouteStop {
  id: string;
  name: string;
  address: string;
  /** ISO datetime — the appointment slot (shown, not a routing constraint). */
  date: string;
  kindLabel?: string;
}

const navUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

const hhmm = (d: string) => new Date(d).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });

export default function DayRoute({ stops, title, subtitle, onOpen }: {
  stops: RouteStop[];
  title: string;
  subtitle?: string;
  onOpen?: (id: string) => void;
}) {
  // Optimise the visiting ORDER (consultant leaves from their base — no pinned
  // start). Off-gazetteer addresses → honest as-listed order, no claim.
  const pts = stops.map(s => coordsForAddress(s.address));
  const canSolve = stops.length >= 3 && pts.every(Boolean);
  const solve = canSolve ? optimiseRoute(pts as GeoPoint[], false) : null;
  const ordered = solve ? solve.order.map(i => stops[i]) : stops;

  const addrs = ordered.map(s => s.address);
  const fullRouteUrl = `https://www.google.com/maps/dir/${addrs.map(encodeURIComponent).join('/')}`;
  const embedSrc = addrs.length >= 2
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(addrs[0])}&daddr=${addrs.slice(1).map(encodeURIComponent).join('+to:')}&output=embed`
    : addrs.length === 1
      ? `https://maps.google.com/maps?q=${encodeURIComponent(addrs[0])}&z=13&output=embed`
      : 'https://maps.google.com/maps?q=Dublin,Ireland&t=m&z=11&output=embed';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-tech" /> {title}
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {ordered.length > 0 && (
          <a href={fullRouteUrl} target="_blank" rel="noreferrer"
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-control bg-tech px-3 text-sm font-semibold text-white hover:bg-tech/90 transition-colors">
            <Navigation className="h-4 w-4" /> Open full route
          </a>
        )}
      </div>

      {/* the insight line — COMPUTED saving or honest neutral copy */}
      {ordered.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {solve && solve.savedKm >= 0.5 ? (
            <>
              <span className="text-doc-deposit font-semibold">Smart route · ~{solve.optimisedKm.toFixed(0)} km</span>
              {' — saves ~'}{solve.savedKm.toFixed(0)} km{solve.savedMin >= 1 ? ` (${solve.savedMin} min)` : ''} vs the unplanned order. More surveys, less driving.
            </>
          ) : solve ? (
            <><span className="text-doc-deposit font-semibold">Smart route · ~{solve.optimisedKm.toFixed(0)} km</span> — already the shortest loop.</>
          ) : (
            <>{ordered.length} {ordered.length === 1 ? 'stop' : 'stops'} in appointment order{stops.length >= 3 ? ' (add site addresses to optimise the drive)' : ''}.</>
          )}
        </p>
      )}

      {/* Desktop: map + list side by side, map ~70% viewport tall. Mobile: stacked. */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_28rem]">
        <MapPanel embedSrc={embedSrc} fullRouteUrl={fullRouteUrl} aspect="aspect-[4/3] lg:aspect-auto lg:h-[70vh]" className="lg:order-2 lg:sticky lg:top-4 lg:self-start" />
        <div className="space-y-1.5 lg:order-1">
          {ordered.map((s, i) => (
            <div key={s.id} className="rounded-panel bg-card shadow-card p-3 flex items-center gap-3">
              <span className={`size-7 rounded-full grid place-items-center text-xs font-bold text-white shrink-0 ${i === 0 ? 'bg-pop' : 'bg-tech'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {s.name}
                  <span className="text-muted-foreground font-normal"> · {hhmm(s.date)}{s.kindLabel ? ` · ${s.kindLabel}` : ''}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{s.address}</div>
              </div>
              <a href={navUrl(s.address)} target="_blank" rel="noreferrer" className="inline-grid place-items-center size-9 rounded-control border border-border hover:bg-muted transition-colors" aria-label={`Navigate to ${s.name}`}>
                <Navigation className="h-4 w-4 text-tech" />
              </a>
              {onOpen && (
                <button className="inline-grid place-items-center size-9 rounded-control border border-border hover:bg-muted transition-colors" onClick={() => onOpen(s.id)} aria-label={`Open ${s.name}`}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {ordered.length === 0 && (
            <div className="rounded-panel bg-card shadow-card p-8 text-center text-sm text-muted-foreground">
              No surveys booked for the day yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
