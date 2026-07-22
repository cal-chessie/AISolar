/**
 * MarketingShell — the shared nav + footer for every marketing page, so the
 * three products stay consistent and cross-linked. Cal's domain plan:
 *
 *   aisolar.ie   → "/"        the hero product (installer OS + the app)
 *   aios.ie      → "/aios"    the parent house (the OS the others run on)
 *   (aiteam.ie)  → "/aiteam"  the AI-workforce offer, a page until it's real
 *
 * Within this one app they're routes; when the domains split, each domain's
 * root maps to its page and the cross-links still resolve. Routing is right
 * from the start.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Menu } from 'lucide-react';
import { AiosWordmark, AisolarWordmark, AiteamWordmark } from '@/components/brand/AiosMark';

export type ProductKey = 'aisolar' | 'aios' | 'aiteam';

const MARK: Record<ProductKey, (p: { className?: string }) => JSX.Element> = {
  aisolar: AisolarWordmark,
  aios: AiosWordmark,
  aiteam: AiteamWordmark,
};

const PRODUCT = {
  aisolar: { name: 'AISOLAR', sub: 'by AIOS', home: '/', cta: { label: 'Get started', to: '/get-started' } },
  aios:    { name: 'AIOS',    sub: '',         home: '/aios', cta: { label: 'Talk to us', to: '/auth' } },
  aiteam:  { name: 'AITEAM',  sub: 'by AIOS', home: '/aiteam', cta: { label: 'Get early access', to: '/auth' } },
} as const;

// Cross-product nav — same on every page so the family is always one click away.
const CROSS = [
  { key: 'aisolar' as const, label: 'AISolar', to: '/' },
  { key: 'aiteam' as const, label: 'AITeam', to: '/aiteam' },
  { key: 'aios' as const, label: 'AIOS', to: '/aios' },
];

export function MarketingNav({ product }: { product: ProductKey }) {
  const p = PRODUCT[product];
  const Mark = MARK[product];
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center gap-6">
        <Link to={p.home} className="flex items-center gap-2.5 shrink-0">
          <Mark className="size-9" />
          <span className="font-semibold tracking-tight">
            {p.name}{p.sub && <span className="text-muted-foreground font-normal"> {p.sub}</span>}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-2">
          {CROSS.map(l => (
            <Link key={l.key} to={l.to}
              className={`text-sm transition-colors duration-instant ${l.key === product ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
              {l.label}
            </Link>
          ))}
          <Link to="/start" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-instant">Pricing</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth" className="hidden sm:inline-flex h-control items-center px-3 text-sm font-medium hover:bg-muted rounded-control transition-colors duration-instant">
            Sign in
          </Link>
          <Link to={p.cta.to} className="inline-flex h-control items-center gap-1.5 rounded-control bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity duration-instant">
            {p.cta.label} <ArrowRight className="size-4" />
          </Link>
          <button className="md:hidden inline-grid place-items-center size-control rounded-control hover:bg-muted" aria-label="Menu">
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter({ product }: { product: ProductKey }) {
  const Mark = MARK[product];
  const name = PRODUCT[product].name;
  const cols: Array<{ head: string; items: Array<{ label: string; to: string }> }> = [
    { head: 'Product', items: [
      { label: 'How it works', to: product === 'aisolar' ? '/#product' : PRODUCT[product].home },
      { label: 'Pricing', to: '/start' },
      { label: 'Start free', to: '/start' },
    ] },
    { head: 'AIOS family', items: [
      { label: 'AISolar', to: '/' },
      { label: 'AITeam', to: '/aiteam' },
      { label: 'AIOS', to: '/aios' },
    ] },
    { head: 'Company', items: [
      { label: 'About', to: '/about' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ] },
  ];
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Mark className="size-9" />
            <span className="font-semibold tracking-tight">{name}</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-body max-w-[15rem]">
            {product === 'aios'
              ? 'The operating system for AI-run businesses.'
              : <>An <span className="font-medium text-foreground">AIOS</span> product.</>}
          </p>
        </div>
        {cols.map(c => (
          <div key={c.head}>
            <p className="label-micro">{c.head}</p>
            <ul className="mt-3 space-y-2">
              {c.items.map(i => (
                <li key={i.label}>
                  <Link to={i.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-instant">{i.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} AISolar Ireland Ltd</span>
          <span className="ml-auto">Part of AIOS</span>
        </div>
      </div>
    </footer>
  );
}
