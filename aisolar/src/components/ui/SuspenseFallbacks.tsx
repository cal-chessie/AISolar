/**
 * Suspense fallbacks — Skeleton loaders that match the shape of the content
 * being loaded. Replaces the bare `<div className="animate-spin...">` spinners
 * that were used everywhere.
 *
 * Usage:
 *   <Suspense fallback={<CockpitSkeleton />}>
 *     <LazyComponent />
 *   </Suspense>
 */

import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton for a full cockpit view (sidebar + main content area). */
export function CockpitSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-4 space-y-3">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-24 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {[0, 1].map(i => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a list of cards (e.g. lead list, document grid). */
export function CardListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a calendar view. */
export function CalendarSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Simple centered spinner — for very short loads. */
export function SpinnerSkeleton({ label }: { label?: string }) {
  return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/40 mx-auto" />
      {label && <div className="text-xs text-muted-foreground mt-2">{label}</div>}
    </div>
  );
}
