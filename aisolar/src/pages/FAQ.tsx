/**
 * FAQ — the AEO centerpiece (Sweep 7).
 *
 * Built to the claude-seo methodology: each answer is a self-contained, citable
 * passage (~100–140 words) under a real question heading, so AI answer engines
 * and search can lift it directly. FAQPage rich results were retired (May 2026)
 * but the schema still counts as an AI/entity signal, so we emit it from the
 * same data the page renders — one source of truth, no drift.
 *
 * Every figure is truth-pass clean and cites an official Irish source
 * (seai.ie, revenue.ie, esbnetworks.ie). No SMS/WhatsApp/roof-detection claims.
 */
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';
import SEOHead from '@/components/SEOHead';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface QA { q: string; a: string; source?: { label: string; href: string }; }

const FAQS: Array<{ group: string; items: QA[] }> = [
  {
    group: 'Grants & cost',
    items: [
      {
        q: 'How much is the SEAI solar grant in 2026?',
        a: 'The SEAI Solar Electricity Grant pays €700 per kWp for the first 2 kWp of panels, then €200 per kWp between 2 and 4 kWp. That caps the grant at €1,800, which you reach at a 4 kWp system. A typical Irish home fits well above 4 kWp, so most domestic installs claim the full €1,800. You apply through SEAI before work begins, using an SEAI-registered installer, and the grant is paid to the homeowner after the install is complete and a post-works BER has been lodged. The rates are set by the SEAI and are indicative until your application is approved.',
        source: { label: 'seai.ie', href: 'https://www.seai.ie' },
      },
      {
        q: 'Do I pay VAT on solar panels in Ireland?',
        a: 'No. The supply and installation of solar panels on a private home has been zero-rated for VAT in Ireland since 1 May 2023, so a domestic supply-and-install job carries 0% VAT. The price you are quoted already reflects that saving — there is no VAT to add on top or to reclaim later. The measure was introduced to lower the upfront cost of home solar and sits alongside the SEAI grant, not instead of it. The 0% rate applies to domestic installations; commercial and non-domestic projects follow the standard VAT rules.',
        source: { label: 'revenue.ie', href: 'https://www.revenue.ie' },
      },
      {
        q: 'How long does solar take to pay for itself in Ireland?',
        a: 'For a typical Irish home, a solar system pays for itself in roughly 5 to 7 years, after which the electricity it generates is effectively free for the 20–25 year life of the panels. The exact payback depends on four things: your electricity usage and bill size, how much of it falls during daylight, your roof’s orientation and shading, and whether you add a battery. The SEAI grant and the 0% VAT rate both shorten payback by cutting the upfront cost. A savings estimate built on your actual bill, rather than an average home, gives a far more reliable payback year — and every figure is confirmed at a full survey.',
      },
      {
        q: 'Do I need a BER to get the SEAI solar grant?',
        a: 'Yes, but not in the way people expect. A post-works Building Energy Rating (BER) assessment is a requirement to claim the SEAI Solar Electricity Grant: you must have a valid BER lodged after the solar is installed. It is a condition of the grant, not an extra cash payment or bonus, and its cost is separate and modest. Your installer or SEAI can advise on arranging it as part of closing out the grant. This is a common point of confusion — the BER is the paperwork that unlocks the grant you have already been approved for, rather than money added on top.',
        source: { label: 'seai.ie', href: 'https://www.seai.ie' },
      },
    ],
  },
  {
    group: 'How solar works',
    items: [
      {
        q: 'What is a day/night meter and why does it matter for solar?',
        a: 'A day/night meter (also called a smart or dual-rate meter) records how much electricity you use during the day versus at night, and often bills the two at different rates. It matters for solar because your panels generate during daylight. If most of your usage is during the day, solar replaces expensive daytime units directly and your savings are higher. If you use more at night, a home battery earns its keep by storing daytime generation for the evening. AISOLAR reads the day/night split straight from your bill, so the estimate reflects how your specific home actually uses power rather than an average.',
        source: { label: 'esbnetworks.ie', href: 'https://www.esbnetworks.ie' },
      },
      {
        q: 'What ESB forms do I need to install solar in Ireland?',
        a: 'Home solar has to be registered with ESB Networks so your installation can safely export surplus electricity to the grid. Which form you use depends on the system. For most domestic installs, your installer submits a microgeneration notification (the NC5 or NC6 form) confirming the inverter and setup. Larger mini-generation systems use the NC7 application and its associated test and declaration forms. The registration also enables the Clean Export Guarantee, the payment you receive for electricity you export. AISOLAR prepares the correct ESB form per customer as part of the compliance pack, so the registered installer signs rather than fills.',
        source: { label: 'esbnetworks.ie', href: 'https://www.esbnetworks.ie' },
      },
    ],
  },
  {
    group: 'The platform',
    items: [
      {
        q: 'How does AISOLAR estimate my solar savings?',
        a: 'AISOLAR builds your estimate from your actual electricity bill, not an average home. It reads up to 21 details — your MPRN, annual usage, the day/night split, your unit and night rates, standing charge and tariff — and sizes a system against how your home really uses power. You can also draw your roof on a satellite map to see how many panels fit. From that it calculates system size, the SEAI grant you qualify for, your annual saving and the year the system breaks even. Every figure traces back to a number on your own bill, which is what lets an installer stand over it against two other quotes. The estimate is indicative and confirmed at a full survey.',
      },
      {
        q: 'Is the AISOLAR solar calculator free?',
        a: 'Yes. The AISOLAR savings calculator is free to use and needs no signup. You either draw your roof on the map and play with the panel layout, or enter your monthly bill, and the estimate — system size, SEAI grant, annual saving and payback — updates live on screen. If you want the exact numbers you can upload your bill for the full 21-point read and book a consultation, but there is no obligation and no account required to get the estimate. Installers can embed the same calculator on their own website, branded to them.',
      },
    ],
  },
];

const ALL = FAQS.flatMap(g => g.items);

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: ALL.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function FAQ() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEOHead
        title="Solar FAQ Ireland — SEAI grant, VAT, payback & meters | AISOLAR"
        description="Clear answers on the 2026 SEAI solar grant (€700/€200, cap €1,800), 0% VAT, day/night meters, ESB forms and payback — grounded in official Irish sources."
        canonical="https://aisolar.ie/faq"
        keywords="SEAI solar grant 2026, solar VAT Ireland, solar payback Ireland, day night meter, ESB microgeneration NC6, BER solar grant"
        structuredData={faqSchema}
      />
      <MarketingNav product="aisolar" />

      <main className="mx-auto max-w-3xl px-5 py-14 lg:py-20">
        <header className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frequently asked</span>
          <h1 className="mt-3 text-[34px] leading-[40px] sm:text-[44px] sm:leading-[50px] font-semibold tracking-tight">
            Solar in Ireland, answered
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Grants, VAT, meters and payback — the questions homeowners actually ask,
            answered from official Irish sources. Indicative figures; confirmed at a survey.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          {FAQS.map(group => (
            <section key={group.group}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                {group.group}
              </h2>
              <div className="mt-5 space-y-8">
                {group.items.map(({ q, a, source }) => (
                  <article key={q}>
                    <h3 className="text-lg font-semibold tracking-tight">{q}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                      {a}
                      {source && (
                        <>
                          {' '}
                          <a href={source.href} target="_blank" rel="noopener noreferrer"
                            className="font-medium text-foreground underline underline-offset-2 hover:no-underline whitespace-nowrap">
                            Source: {source.label}
                          </a>
                        </>
                      )}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Conversion nudge */}
        <div className="mt-16 rounded-panel bg-card shadow-card p-6 sm:p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight">See it on your own numbers</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Draw your roof or drop in your bill and watch the grant, saving and payback
            work themselves out — free, no signup.
          </p>
          <Link to="/calculator"
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-control bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            Try the calculator <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      <MarketingFooter product="aisolar" />
    </div>
  );
}
