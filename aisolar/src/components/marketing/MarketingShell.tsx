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
import { ArrowRight, Menu, Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import { AiosWordmark, AisolarWordmark, AiteamWordmark } from '@/components/brand/AiosMark';
import { brand } from '@/config/brand';

export type ProductKey = 'aisolar' | 'aios' | 'aiteam';

/* Cal: one different CTA colour per page — the family stays monochrome, the
   closing button carries each page's identity. */
export const PAGE_ACCENT: Record<ProductKey, string> = {
  aios: 'bg-primary text-primary-foreground hover:opacity-90',
  aisolar: 'bg-pop text-white hover:opacity-90',
  aiteam: 'bg-doc-deposit text-white hover:opacity-90',
};

const MARK: Record<ProductKey, (p: { className?: string }) => JSX.Element> = {
  aisolar: AisolarWordmark,
  aios: AiosWordmark,
  aiteam: AiteamWordmark,
};

const PRODUCT = {
  aisolar: { name: 'AISolar', home: '/aisolar', cta: { label: 'Get started', to: '/get-started' } },
  aios:    { name: 'AIOS',    home: '/',        cta: { label: 'Talk to us', to: '/auth' } },
  aiteam:  { name: 'AITeam',  home: '/aiteam',  cta: { label: 'Get early access', to: '/get-started' } },
} as const;

// Cross-product nav — same on every page so the family is always one click away.
const CROSS = [
  { key: 'aios' as const, label: 'AIOS', to: '/' },
  { key: 'aisolar' as const, label: 'AISolar', to: '/aisolar' },
  { key: 'aiteam' as const, label: 'AITeam', to: '/aiteam' },
];

export function MarketingNav({ product }: { product: ProductKey }) {
  const p = PRODUCT[product];
  const Mark = MARK[product];
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center gap-6">
        {/* ONE mark, no duplicate text — the tile IS the wordmark (Cal). */}
        <Link to={p.home} className="shrink-0" aria-label={p.name}>
          <Mark className="size-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-2">
          {CROSS.map(l => (
            <Link key={l.key} to={l.to}
              className={`text-sm transition-colors duration-instant ${l.key === product ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
              {l.label}
            </Link>
          ))}
          <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-instant">Pricing</Link>
          <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-instant">Docs</Link>
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-instant">About</Link>
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

/* The closing band every page ends on — same shape everywhere, the button in
   the page's own colour. Use INSTEAD of hand-rolled final CTAs. */
export function MarketingCta({ product, title, sub, ctaLabel, ctaTo }: {
  product: ProductKey; title: string; sub?: string; ctaLabel?: string; ctaTo?: string;
}) {
  const p = PRODUCT[product];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
      <div className="rounded-[16px] bg-card shadow-card px-6 py-12 lg:py-16 text-center">
        <h2 className="text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">{title}</h2>
        {sub && <p className="mt-3 max-w-xl mx-auto text-base text-muted-foreground leading-body">{sub}</p>}
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to={ctaTo ?? p.cta.to}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-6 text-sm font-semibold transition-opacity duration-instant ${PAGE_ACCENT[product]}`}>
            {ctaLabel ?? p.cta.label} <ArrowRight className="size-4" />
          </Link>
          <Link to="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-[12px] bg-background px-6 text-sm font-semibold shadow-card hover:bg-muted transition-colors duration-instant">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

/* TikTok has no lucide glyph — a minimal inline path, same stroke language. */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.75a5.76 5.76 0 0 0-.77-.05 5.66 5.66 0 1 0 5.66 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.34 4.34 0 0 1-3.22-1.48Z" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'LinkedIn', href: brand.social.linkedin, Icon: Linkedin },
  { label: 'X', href: brand.social.twitter, Icon: Twitter },
  { label: 'Instagram', href: brand.social.instagram, Icon: Instagram },
  { label: 'Facebook', href: brand.social.facebook, Icon: Facebook },
  { label: 'YouTube', href: brand.social.youtube, Icon: Youtube },
  { label: 'TikTok', href: brand.social.tiktok, Icon: TikTokIcon },
];

export function MarketingFooter({ product }: { product: ProductKey }) {
  const Mark = MARK[product];
  const name = PRODUCT[product].name;
  const cols: Array<{ head: string; items: Array<{ label: string; to: string }> }> = [
    { head: 'Product', items: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'Free bill analysis', to: '/start' },
      { label: 'ROI calculator', to: '/calculator' },
      { label: 'Docs', to: '/docs' },
      { label: 'Browse every view', to: '/demo' },
    ] },
    { head: 'AIOS family', items: [
      { label: 'AISolar', to: '/aisolar' },
      { label: 'AITeam', to: '/aiteam' },
      { label: 'AIOS', to: '/' },
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
          <Mark className="size-10" />
          <p className="mt-3 text-xs text-muted-foreground leading-body max-w-[15rem]">
            {product === 'aios'
              ? 'The operating system for AI-run businesses.'
              : <>An <span className="font-medium text-foreground">AIOS</span> product.</>}
          </p>
          <div className="mt-4 flex items-center gap-1">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                className="inline-grid place-items-center size-8 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-instant">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
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
