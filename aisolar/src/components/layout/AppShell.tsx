/**
 * AppShell — the ONE application frame every persona view composes into.
 *
 * Cal.com pattern: fixed left sidebar (icon+label, active state, collapsible
 * to an icon rail), 48px page header with title + ONE primary action, calm
 * bordered content region. No per-view hand-rolled sidebars — that was the
 * root of the "everything nested inside each other" problem.
 *
 * Density is wired per persona via data-density (instrument.css):
 *   installer → "comfortable"  (44px+ targets: gloves, outdoors, one hand)
 *   owner/consultant → default (36px controls, Cal.com-measured)
 *
 * Mobile (<1024px): sidebar becomes a bottom nav (≤5 items, MD guidance) —
 * primary items only; the rest go into a "More" sheet.
 */
import { ReactNode, useEffect, useState } from 'react';
import { ChevronLeft, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ShellNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  badge?: number;
  /** Show in the mobile bottom nav (max 5 marked primary) */
  primary?: boolean;
}

interface AppShellProps {
  persona: 'owner' | 'consultant' | 'installer' | 'customer';
  brandName: string;
  personaLabel: string;
  nav: ShellNavItem[];
  activeId: string;
  /** Page title shown in the header for the active section */
  title: string;
  /** ONE primary action for this screen (Cal.com: single CTA per screen) */
  primaryAction?: ReactNode;
  /** Secondary header content (search, toggles) — kept visually subordinate */
  headerExtra?: ReactNode;
  children: ReactNode;
}

const COLLAPSE_KEY = 'aisolar_shell_collapsed';

export function AppShell({
  persona, brandName, personaLabel, nav, activeId, title,
  primaryAction, headerExtra, children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const density = persona === 'installer' ? 'comfortable' : undefined;
  const primaryNav = nav.filter(n => n.primary).slice(0, 4);
  const overflowNav = nav.filter(n => !primaryNav.includes(n));

  return (
    <div data-density={density} className="flex min-h-dvh bg-background text-foreground">
      {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 border-r border-border bg-sidebar',
          'transition-[width] duration-fast ease-out',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Brand / workspace block — Cal.com puts identity top-left, quiet */}
        <div className={cn('flex items-center gap-2 h-header px-3 border-b border-border', collapsed && 'justify-center px-0')}>
          <div className="size-7 shrink-0 rounded-md bg-primary grid place-items-center text-primary-foreground text-xs font-semibold">
            {brandName.slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-none">
              <div className="text-sm font-semibold truncate">{brandName}</div>
              <div className="text-2xs text-muted-foreground mt-0.5">{personaLabel}</div>
            </div>
          )}
        </div>

        {/* Nav — icon+label always (icon-only harms discoverability), active state visible */}
        <nav className="flex-1 overflow-y-auto scroll-slim py-2 px-2 flex flex-col gap-0.5">
          {nav.map(item => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={item.onSelect}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md h-control px-2.5 text-sm font-medium',
                  'transition-colors duration-instant cursor-pointer',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-accent/10 text-accent-foreground text-foreground border border-accent/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent',
                )}
              >
                <span className="shrink-0 [&>svg]:size-4">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge ? (
                  <span className="ml-auto text-2xs rounded-full bg-destructive text-destructive-foreground px-1.5 py-0.5 tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle — bottom, out of the way */}
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost" size="sm"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full justify-center"
          >
            <ChevronLeft className={cn('size-4 transition-transform duration-fast', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page header: 48px, title left, ONE primary action right */}
        <header className="sticky top-0 z-20 flex items-center gap-3 h-header px-4 lg:px-6 border-b border-border bg-background/95 backdrop-blur-sm">
          <h1 className="text-md font-semibold truncate">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {headerExtra}
            {primaryAction}
          </div>
        </header>

        {/* Content — calm, bordered, breathing room; pb clears mobile bottom nav */}
        <main className="flex-1 min-w-0 p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Bottom nav (mobile) — ≤5 items, labels always ─────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
        {primaryNav.map(item => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={item.onSelect}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 h-14 text-2xs font-medium cursor-pointer',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className={cn('[&>svg]:size-5 rounded-md px-3 py-0.5 transition-colors duration-instant', active && 'bg-accent/10')}>
                {item.icon}
              </span>
              <span className="truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-1 h-14 text-2xs font-medium text-muted-foreground cursor-pointer"
        >
          <span className="[&>svg]:size-5 px-3 py-0.5"><MoreHorizontal /></span>
          <span>More</span>
        </button>
      </nav>

      {/* "More" sheet for overflow nav on mobile */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-label="More navigation">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-modal bg-background border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">More</span>
              <Button variant="ghost" size="sm" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {overflowNav.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setMoreOpen(false); item.onSelect(); }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md h-control-lg px-3 text-sm font-medium border cursor-pointer',
                    item.id === activeId
                      ? 'border-accent/30 bg-accent/10'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="[&>svg]:size-4">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
