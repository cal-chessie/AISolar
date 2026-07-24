/**
 * BlogArticle — /blog/:slug
 *
 * The reading surface. Built for citability (the AEO play): real question
 * headings, self-contained passages, a sources block, and BlogPosting schema
 * emitted from the same data the page renders — one source of truth.
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, ExternalLink } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';
import SEOHead from '@/components/SEOHead';
import { getArticle, ARTICLES, COLOUR_CLASS } from '@/content/articles';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticle(slug) : undefined;

  if (!article) return <Navigate to="/blog" replace />;

  const c = COLOUR_CLASS[article.colour];
  const url = `https://aisolar.ie/blog/${article.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.updated || article.published,
    inLanguage: 'en-IE',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'AISOLAR', url: 'https://aisolar.ie' },
    publisher: { '@type': 'Organization', name: 'AISOLAR', url: 'https://aisolar.ie' },
    citation: article.sources.map(s => s.href),
  };

  const others = ARTICLES.filter(a => a.slug !== article.slug).slice(0, 2);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEOHead
        title={`${article.title} | AISOLAR`}
        description={article.description}
        canonical={url}
        ogType="article"
        structuredData={schema}
      />
      <MarketingNav product="aisolar" />

      <main className="mx-auto max-w-2xl px-5 py-12 lg:py-16">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" /> All guides
        </Link>

        <header className="mt-6">
          <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide ${c.text}`}>
            <span className={`size-1.5 rounded-full ${c.dot}`} /> {article.tag}
          </span>
          <h1 className="mt-3 text-[30px] leading-[36px] sm:text-[38px] sm:leading-[44px] font-semibold tracking-tight">
            {article.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
            <time dateTime={article.published}>{fmtDate(article.published)}</time>
            <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {article.readMins} min read</span>
            <span>· Figures verified against official Irish sources</span>
          </div>
        </header>

        <article className="mt-10 space-y-10">
          {article.sections.map(s => (
            <section key={s.h}>
              <h2 className="text-xl font-semibold tracking-tight">{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{para}</p>
              ))}

              {s.callout && (
                <div className={`mt-5 rounded-panel ${c.bg} border-l-4 ${c.border} p-4`}>
                  <p className={`text-2xs font-semibold uppercase tracking-wide ${c.text}`}>{s.callout.label}</p>
                  <p className="mt-1.5 text-sm text-foreground leading-relaxed">{s.callout.body}</p>
                </div>
              )}

              {s.table && (
                <div className="mt-5 overflow-x-auto rounded-panel border border-border">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="bg-muted/40">
                        {s.table.head.map(h => (
                          <th key={h} className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {s.table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`px-3 py-2 ${ci === 0 ? 'font-medium' : 'text-muted-foreground'} ${ci === 1 ? 'tabular-nums' : ''}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </article>

        {/* Sources — E-E-A-T: every claim traceable */}
        <section className="mt-12 rounded-panel bg-card shadow-card p-5">
          <h2 className="text-sm font-semibold">Sources</h2>
          <ul className="mt-3 space-y-2">
            {article.sources.map(s => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 hover:no-underline">
                  {s.label} <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-2xs text-muted-foreground">
            Figures are indicative and confirmed at a full survey and on your SEAI application.
          </p>
        </section>

        {/* Problem → Solution → Ask */}
        <section className="mt-8 rounded-panel bg-primary text-primary-foreground p-6 sm:p-8">
          <p className="label-micro text-brand-aisolar">The problem</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            You still don't know what your roof would do
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/75 leading-relaxed">
            General guidance only gets you so far. Draw your roof or drop in your
            bill and see your system size, your SEAI grant, your annual saving and
            the year it breaks even — on your numbers, not an average home's.
          </p>
          <Link to="/calculator"
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-control bg-brand-aisolar text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Get my estimate <ArrowRight className="size-4" />
          </Link>
          <p className="mt-3 text-2xs text-primary-foreground/50">Free · no signup</p>
        </section>

        {/* Keep reading */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Keep reading</h2>
          <div className="mt-4 space-y-3">
            {others.map(o => {
              const oc = COLOUR_CLASS[o.colour];
              return (
                <Link key={o.slug} to={`/blog/${o.slug}`}
                  className={`group block min-w-0 rounded-panel bg-card shadow-card border-l-4 ${oc.border} p-4 hover:shadow-lg transition-shadow`}>
                  <span className={`text-2xs font-semibold uppercase tracking-wide ${oc.text}`}>{o.tag}</span>
                  <p className="mt-1 font-medium leading-snug">{o.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{o.excerpt}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <MarketingFooter product="aisolar" />
    </div>
  );
}
