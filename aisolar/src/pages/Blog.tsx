/**
 * Blog — /blog
 *
 * The index. Every article carries one family colour, so the blog is where all
 * four show up together (Cal: "all colours in blog"). Cards are the canonical
 * floating-panel style; colour is the left edge and the tag, never the canvas.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';
import SEOHead from '@/components/SEOHead';
import { ARTICLES, COLOUR_CLASS } from '@/content/articles';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Blog() {
  // Blog schema: an ItemList of the posts, so engines see the set.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'AISOLAR blog',
    description: 'Guides on Irish solar: SEAI grants, day/night meters, payback and ESB registration.',
    url: 'https://aisolar.ie/blog',
    blogPost: ARTICLES.map(a => ({
      '@type': 'BlogPosting',
      headline: a.title,
      description: a.description,
      datePublished: a.published,
      url: `https://aisolar.ie/blog/${a.slug}`,
    })),
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEOHead
        title="Solar engineering & compliance, for installers | AISOLAR"
        description="Accurate data and the engineering behind it, for Irish solar installers and regulators: SEAI grant mechanics, sizing from real usage, payback maths and ESB NC6/NC7 registration."
        canonical="https://aisolar.ie/blog"
        keywords="solar installer guides Ireland, SEAI grant mechanics, ESB NC6 NC7, solar system sizing, microgeneration compliance, solar payback calculation"
        structuredData={schema}
      />
      <MarketingNav product="aisolar" />

      <main className="mx-auto max-w-5xl px-5 py-14 lg:py-20">
        <header className="max-w-2xl">
          <p className="label-micro">For installers</p>
          <h1 className="mt-2 text-[34px] leading-[40px] sm:text-[44px] sm:leading-[50px] font-semibold tracking-tight">
            Solar, done to the numbers
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-body">
            The engineering and the data an installer works from, and a regulator
            can check. Grant mechanics, sizing from real usage, payback maths and
            ESB registration, every figure sourced from SEAI, Revenue and ESB Networks.
          </p>
        </header>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {ARTICLES.map(a => {
            const c = COLOUR_CLASS[a.colour];
            return (
              <Link
                key={a.slug}
                to={`/blog/${a.slug}`}
                className={`group min-w-0 rounded-panel bg-card shadow-card border-l-4 ${c.border} p-5 hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide ${c.text}`}>
                    <span className={`size-1.5 rounded-full ${c.dot}`} /> {a.tag}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-2xs text-muted-foreground">
                    <Clock className="size-3" /> {a.readMins} min
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold tracking-tight leading-snug group-hover:opacity-90">
                  {a.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.excerpt}</p>
                <div className="mt-4 flex items-center gap-2 text-2xs text-muted-foreground">
                  <span>{fmtDate(a.published)}</span>
                  <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${c.text}`}>
                    Read <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Problem → Solution → Ask */}
        <section className="mt-14 rounded-panel bg-card shadow-card p-6 sm:p-8">
          <p className="label-micro text-brand-aisolar">The problem</p>
          <h2 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight">
            Every quote you get is built on a different set of assumptions
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            That is what makes three quotes impossible to compare. Ours starts
            from your own bill — your usage, your day/night split, your tariff —
            so the system size, the grant and the payback year all trace back to
            a number you can check.
          </p>
          <Link
            to="/calculator"
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-control bg-brand-aisolar text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Run it on your own bill <ArrowRight className="size-4" />
          </Link>
          <p className="mt-3 text-2xs text-muted-foreground">Free · no signup · takes a minute</p>
        </section>
      </main>

      <MarketingFooter product="aisolar" />
    </div>
  );
}
