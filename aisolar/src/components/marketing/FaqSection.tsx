/**
 * FaqSection — reusable AEO FAQ block.
 *
 * Renders citable Q&A (question headings + self-contained answers) AND emits
 * FAQPage JSON-LD from the SAME data, so the schema never drifts from what the
 * page shows. Used across AIOS, Agents and Blog as three interconnected batches
 * — each answer can cite an official source and cross-link to the sibling pages,
 * which is what ties the cluster together for AI answer engines (query fan-out).
 *
 * Built to the ai-seo / claude-seo methodology: direct answer first, ~50–90
 * words, question phrased the way people ask it, official-source citation as the
 * authority signal. Answers pass stop-slop — no em dashes, no tricolons, active.
 */
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export interface FaqItem {
  q: string;
  a: string;
  /** authoritative source — the AEO citation signal */
  source?: { label: string; href: string };
  /** internal cross-link — interconnects the three batches */
  link?: { label: string; to: string };
}

export function FaqSection({
  eyebrow = 'FAQ',
  title,
  intro,
  items,
  accent = 'bg-muted-foreground',
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  items: FaqItem[];
  accent?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(i => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
      {/* one source of truth: the schema is built from the same items rendered */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-2xs font-medium text-muted-foreground">
        <span className={`size-1.5 rounded-full ${accent}`} /> {eyebrow}
      </span>
      <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">{intro}</p>}
      <dl className="mt-8 divide-y divide-border border-t border-border">
        {items.map(i => (
          <div key={i.q} className="py-6">
            <dt className="text-base sm:text-lg font-semibold tracking-tight">{i.q}</dt>
            <dd className="mt-2 text-sm sm:text-[15px] leading-relaxed text-muted-foreground text-pretty">
              {i.a}
              {(i.source || i.link) && (
                <span className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-2xs">
                  {i.source && (
                    <a href={i.source.href} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
                      {i.source.label} <ArrowUpRight className="size-3" />
                    </a>
                  )}
                  {i.link && (
                    <Link to={i.link.to} className="font-medium text-brand-aios hover:underline">
                      {i.link.label} →
                    </Link>
                  )}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
