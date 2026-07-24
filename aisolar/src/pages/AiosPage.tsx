/**
 * AiosPage — /aios (aios.ie)
 *
 * LITERALLY cal.com/enterprise's page structure, carrying AIOS:
 *   hero (eyebrow → H1 → sub → dark+light CTAs → product visual)
 *   → trust strip
 *   → Key benefits (numbered 01–04)
 *   → Compliance band
 *   → Security features (numbered 01–04)
 *   → The family (in place of testimonials — no fabricated quotes)
 *   → Features (numbered 01–04)
 *   → final CTA
 *
 * Claims held to what's real: GDPR tooling, EU hosting, refs-only kernel,
 * append-only record, approval gates, BYO keys. No SOC2/ISO/SLA invention.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Check, ShieldCheck, GitBranch } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import PaperworkVisual from '@/components/marketing/PaperworkVisual';
import { Wordmark, AisalesWordmark } from '@/components/brand/AiosMark';

const CAL_LINK = 'https://cal.com/renewableireland/solar-consultation';

/* cal.com/enterprise's repeated CTA pair */
function CtaPair({ light }: { light?: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <a href={CAL_LINK} target="_blank" rel="noreferrer"
        className={`inline-flex h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition-opacity hover:opacity-90 ${light ? 'bg-background text-foreground' : 'bg-primary text-primary-foreground'}`}>
        Talk to us <ArrowRight className="size-4" />
      </a>
      <Link to="/get-started"
        className={`inline-flex h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition-colors ${light ? 'border border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10' : 'bg-card shadow-card hover:bg-muted'}`}>
        Get started <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/* cal.com/enterprise's numbered 01–04 item */
function Numbered({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-[16px] bg-card shadow-card p-6">
      <span className="text-sm font-semibold tabular-nums text-muted-foreground">{n}</span>
      <h3 className="mt-3 text-md font-semibold leading-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-body">{body}</p>
    </div>
  );
}

/* Section header in cal.com's pattern: eyebrow → big H2 → sub → CTA pair */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="max-w-2xl">
      <p className="label-micro">{eyebrow}</p>
      <h2 className="mt-2 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-muted-foreground leading-body">{sub}</p>
      <CtaPair />
    </div>
  );
}

/* Hero visual — the KERNEL: the hash-chained record + tenant tree. The thing
   no other page can show, so the homescreen stops looking like AITeam. */
function KernelVisual() {
  // A git-graph style chain rail: each event is a node linked to the last.
  // The newest row is "sealed just now" — the record breathing, not a table.
  const events = [
    { seq: 4812, type: 'LeadCreated',      tenant: 'Solar Roscommon',   agent: 'intake',      when: '09:41', hash: '9f2e…c41a' },
    { seq: 4813, type: 'ProposalDrafted',  tenant: 'Renewable Ireland', agent: 'drafter',     when: '09:52', hash: 'b7d1…08ff' },
    { seq: 4814, type: 'DepositPaid',      tenant: 'Solar Ireland',     agent: 'bookkeeper',  when: '10:07', hash: '30aa…d9e2' },
    { seq: 4815, type: 'InstallScheduled', tenant: 'Solar Roscommon',   agent: 'coordinator', when: 'now',   hash: 'e6c4…17b8' },
  ];
  const last = events.length - 1;
  return (
    <div className="rounded-[16px] bg-card shadow-card overflow-hidden text-left">
      <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <GitBranch className="size-4 text-primary" />
        <span className="text-sm font-semibold">kernel.events</span>
        <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-doc-deposit opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-doc-deposit" />
          </span>
          live
        </span>
        <span className="ml-auto text-2xs font-medium rounded-full bg-doc-deposit/10 text-doc-deposit px-2 py-0.5">append-only</span>
      </div>
      <div className="font-mono">
        {events.map((e, i) => (
          <div key={e.seq} className={`relative pl-10 pr-4 py-2.5 text-xs ${i === last ? 'bg-tech-subtle' : ''}`}>
            {/* chain rail: node + link to the previous event */}
            {i > 0 && <span aria-hidden className="absolute left-[19px] top-0 h-[13px] w-px bg-border" />}
            {i < last && <span aria-hidden className="absolute left-[19px] bottom-0 h-[calc(50%-5px)] w-px bg-border" />}
            <span aria-hidden className={`absolute left-4 top-1/2 -mt-[3.5px] size-[7px] rounded-full border ${i === last ? 'bg-tech border-tech' : 'bg-card border-muted-foreground/50'}`} />
            <div className="flex items-center gap-3">
              <span className="tabular-nums text-muted-foreground">#{e.seq}</span>
              <span className="font-semibold text-foreground">{e.type}</span>
              <span className="hidden sm:inline text-muted-foreground truncate">{e.tenant}</span>
              <span className="ml-auto tabular-nums text-tech">{e.hash}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
              <Bot className="size-3" /> {e.agent} agent · {e.when}
              {i === last && <span className="ml-auto font-sans font-medium text-tech">sealed just now</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-2xs text-muted-foreground bg-muted/30">
        <span>3 tenants · one engine</span>
        <span className="hidden sm:inline">every hash chains to the last — nothing rewritten, ever</span>
        <span className="ml-auto inline-flex items-center gap-1"><Bot className="size-3" /> 10 agents watching</span>
      </div>
    </div>
  );
}

/* (old agent feed removed — it belongs to AITeam, not the kernel page) */

export default function AiosPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav product="aios" />

      <main>
        {/* ── Hero (cal.com/enterprise: eyebrow → H1 → sub → CTAs → visual) ── */}
        <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 lg:pt-16 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
                <span className="size-1.5 rounded-full bg-primary" /> Enterprise
              </span>
              <h1 className="mt-5 text-[32px] leading-[38px] sm:text-[44px] sm:leading-[50px] font-semibold tracking-tight">
                The operating system for AI-run business
              </h1>
              <p className="mt-4 max-w-xl text-base sm:text-lg text-muted-foreground leading-body">
                Run more of your company on agents that draft, schedule, chase
                and report — on one immutable record, with you approving every
                send.
              </p>
              {/* Cal: the login lives on the home screen — Google first,
                  CTAs side by side like every other page. */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <GoogleAuthButton label="Continue with Google" className="sm:w-auto sm:px-5" />
                <Link to="/get-started"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-card px-5 text-sm font-semibold shadow-card hover:bg-muted transition-colors">
                  Get started with email <ArrowRight className="size-4" />
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Free to start. No card required.</p>
            </div>
            <KernelVisual />
          </div>
        </section>

        {/* ── Key benefits (numbered 01–04) ────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <SectionHead
            eyebrow="Key benefits"
            title="Do more work. Chase less admin. Keep every record."
            sub="Unlock an operation that runs itself: agents on the busywork, one record of truth, and a clear window on everything they do."
          />
          <div className="mt-10 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Numbered n="01" title="Unlimited brands, one engine"
              body="Run every brand, county and company on one platform. Each tenant is isolated with its own keys — none can see another's data." />
            <Numbered n="02" title="A clear window on every agent"
              body="Agents post what they did in plain English, attributed and timestamped. One tap flags a mistake, and the correction trains them." />
            <Numbered n="03" title="An immutable record"
              body="Every event is hash-chained and append-only. Nothing is edited or deleted — corrections are added. Auditable end to end." />
            <Numbered n="04" title="Cost-capped AI"
              body="Every model call is logged and budget-capped per day. When the cap is hit, deterministic fallbacks keep the work moving." />
          </div>
        </section>

        {/* ── Compliance band ──────────────────────────────────────────────── */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="label-micro">Compliance</p>
              <h2 className="mt-2 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
                Privacy by design, on EU soil
              </h2>
              <p className="mt-3 text-muted-foreground leading-body">
                Your operating system shouldn't be the weakest link in your
                compliance stack. AIOS keeps personal data out of the kernel by
                design — the record holds references, never PII — with EU data
                residency, GDPR tooling and right-to-erasure built in from day
                one.
              </p>
              <CtaPair />
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {['GDPR tooling built in', 'EU data residency (Frankfurt)', 'Refs-only kernel — no PII', 'Right to erasure (Art. 17)', 'Encrypted in transit + at rest'].map(m => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-card shadow-card px-3 py-1.5 text-xs font-medium">
                  <ShieldCheck className="size-3.5 text-doc-deposit" /> {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security features (numbered 01–04) ───────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <SectionHead
            eyebrow="Security features"
            title="Designed for control you can prove"
            sub="No patchwork tools and scattered accounts — one engine with unified isolation, approval gates and an audit trail that can't be rewritten."
          />
          <div className="mt-10 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Numbered n="01" title="Tenant isolation"
              body="Each business runs in its own tenant with its own keys and row-level security. Data never crosses the wall." />
            <Numbered n="02" title="Approval gates"
              body="Nothing customer-facing sends itself. Agents draft and propose; a named human approves. That line never moves." />
            <Numbered n="03" title="Append-only audit trail"
              body="The kernel records every event in a hash chain. What happened is provable — to a customer, an auditor or a court." />
            <Numbered n="04" title="Your keys stay yours"
              body="Bring your own API keys per tenant — email, AI, payments. Leave any time with your data and your keys." />
          </div>
        </section>

        {/* ── The family (in place of testimonials — nothing invented) ─────── */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="label-micro">The family</p>
              <h2 className="mt-2 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
                Proven in the field first
              </h2>
              <p className="mt-3 text-muted-foreground leading-body">
                We don't sell theory. AISolar runs the whole solar pipeline on
                this kernel today — the same engine you'd build your operation on.
              </p>
            </div>
            <div className="mt-10 grid md:grid-cols-3 gap-4">
              {[
                { name: 'AISolar', tag: 'Live', body: 'The installer OS: a bill goes in, an agent-drafted proposal comes out, one cockpit runs the crew.', to: '/aisolar', cta: 'Explore AISolar' },
                { name: 'AITeam', tag: 'Early access', body: 'The workforce layer: hire the drafter, the scheduler, the chaser, the bookkeeper and the analyst.', to: '/aiteam', cta: 'See AITeam' },
                { name: 'Your vertical', tag: 'Built with us', body: 'The same kernel, pointed at your industry. We build the agents and flows around how your business runs.', to: CAL_LINK, cta: 'Talk to us', external: true },
              ].map(c => (
                c.external ? (
                  <a key={c.name} href={c.to} target="_blank" rel="noreferrer" className="group rounded-[16px] bg-card shadow-card p-6 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-tight">{c.name}</h3>
                      <span className="text-2xs font-medium rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{c.tag}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-body flex-1">{c.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium group-hover:gap-2.5 transition-all">{c.cta} <ArrowRight className="size-4" /></span>
                  </a>
                ) : (
                  <Link key={c.name} to={c.to} className="group rounded-[16px] bg-card shadow-card p-6 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-tight">{c.name}</h3>
                      <span className="text-2xs font-medium rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{c.tag}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-body flex-1">{c.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium group-hover:gap-2.5 transition-all">{c.cta} <ArrowRight className="size-4" /></span>
                  </Link>
                )
              ))}
            </div>
          </div>
        </section>

        {/* ── Features (numbered 01–04) ────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <SectionHead
            eyebrow="Features"
            title="Simplify the whole operation, not one task"
            sub="AIOS coordinates the agents, the people and the record — so the work flows from first contact to final invoice without falling between tools."
          />
          <div className="mt-10 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Numbered n="01" title="Agents that own a job"
              body="The drafter, the scheduler, the chaser, the bookkeeper, the analyst — each owns one job and does it every time." />
            <Numbered n="02" title="A cockpit per role"
              body="Owner, consultant and field crew each get the view built for them, off the same live data. No double entry, ever." />
            <Numbered n="03" title="Vertical flows built in"
              body="Bill-to-proposal, survey-to-install, grant tracking — real industry flows, not a blank canvas you have to wire yourself." />
            <Numbered n="04" title="Corrections as training"
              body="When an agent gets something wrong, one tap fixes it — and the correction becomes the training data for next time." />
          </div>
        </section>

        {/* ═══ AISales — the sales cockpit, included with the platform ═══ */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div>
                <div className="flex items-center gap-3">
                  <AisalesWordmark className="size-14" />
                  <span className="text-2xs font-semibold uppercase tracking-wide rounded-full bg-tech/10 text-tech px-2.5 py-1">Included with the platform</span>
                </div>
                <h2 className="mt-5 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
                  The pipeline sells itself forward
                </h2>
                <p className="mt-3 text-muted-foreground leading-body max-w-lg">
                  AISales is the closer's cockpit: every lead on one board with
                  its money, the calendar that opens straight into the client,
                  and the AI coach whispering the next best move. Drag a card,
                  the stage advances, the agents take the admin.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {['Six-phase board with live pipeline value', 'A booked call opens the client — prep, survey, proposal in one flow', 'Drag to advance; the agents handle what follows'].map(x => (
                    <li key={x} className="flex items-start gap-2.5 text-sm"><Check className="size-4 text-tech mt-0.5 shrink-0" /><span>{x}</span></li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/get-started" className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-tech px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                    Run your pipeline on AISales <ArrowRight className="size-4" />
                  </Link>
                  <Link to="/aisolar" className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-card px-5 text-sm font-semibold shadow-card hover:bg-muted transition-colors">
                    See it inside AISolar
                  </Link>
                </div>
              </div>

              {/* the wow shot: the live pipeline board, money on top */}
              <div className="rounded-[16px] bg-card shadow-card overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border">
                  <AisalesWordmark className="size-8" />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold tabular-nums">€147,600 <span className="font-normal text-muted-foreground text-xs">pipeline</span></p>
                    <p className="text-2xs text-muted-foreground">11 active · <span className="text-pop font-medium">1 hot</span></p>
                  </div>
                  <span className="ml-auto text-2xs text-muted-foreground">drag to advance</span>
                </div>
                <div className="grid grid-cols-3 gap-px bg-border">
                  {([
                    ['Survey', 'bg-tech', [['Tom Brennan', '€278/mo'], ['Linda O\'S.', '€198/mo']]],
                    ['Proposal', 'bg-doc-proposal', [['Sarah McD.', '€24,300'], ['James W.', '€16,200']]],
                    ['Contract', 'bg-doc-contract', [['Siobhán M. 🔥', '€24,300']]],
                  ] as const).map(([label, dot, cards]) => (
                    <div key={label} className="bg-card min-h-[10rem]">
                      <div className="flex items-center gap-1.5 px-2.5 h-8 border-b border-border">
                        <span className={`size-2 rounded-full ${dot}`} />
                        <span className="text-2xs font-semibold uppercase tracking-wide">{label}</span>
                      </div>
                      <div className="p-1.5 space-y-1.5">
                        {cards.map(([n, v]) => (
                          <div key={n} className="rounded-[8px] border border-border bg-background p-2">
                            <p className="text-xs font-medium truncate">{n}</p>
                            <p className="text-2xs text-muted-foreground tabular-nums">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-border bg-muted/30 text-2xs text-muted-foreground">
                  AI coach: "Siobhán's contract is signed — book the install while she's warm."
                </div>
              </div>
            </div>
          </div>
        </section>

                {/* ── The best part: regulated paperwork that runs itself ─────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <span className="label-micro text-tech">Compliance, on the record</span>
              <h2 className="mt-3 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
                Regulated paperwork,<br />running itself
              </h2>
              <p className="mt-4 text-muted-foreground leading-body max-w-lg">
                Grant applications, grid connection forms, engineered diagrams,
                certificates — prepared from captured data, tracked through
                three gates, every step an event on the kernel's append-only
                record. Agents prepare, track and chase. Registered people
                sign. Nothing files itself pretending to be them.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex gap-2"><span className="text-doc-deposit">✓</span> The right form picked automatically — never two, never the wrong one</li>
                <li className="flex gap-2"><span className="text-doc-deposit">✓</span> Diagrams generated, not hand-drawn — regulators reject hand-drawn</li>
                <li className="flex gap-2"><span className="text-doc-deposit">✓</span> One glance per customer: three dots and the next thing, in words</li>
              </ul>
            </div>
            <PaperworkVisual />
          </div>
        </section>

{/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-16 lg:pb-24">
          <div className="rounded-[16px] bg-primary text-primary-foreground px-6 py-12 lg:px-14 lg:py-16 text-center shadow-card">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">See it running</h2>
            <p className="mt-3 text-primary-foreground/70 leading-body max-w-lg mx-auto">
              AISolar is the kernel in production today. Watch a bill turn into
              a proposal without anyone touching a keyboard.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/aisolar" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-background text-foreground px-6 text-sm font-semibold hover:opacity-90 transition-opacity">
                Explore AISolar <ArrowRight className="size-4" />
              </Link>
              <a href={CAL_LINK} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-primary-foreground/25 px-5 text-sm font-semibold hover:bg-primary-foreground/10 transition-colors">
                Talk to us
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter product="aios" />
    </div>
  );
}
