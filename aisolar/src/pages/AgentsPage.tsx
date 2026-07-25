/**
 * AgentsPage — /agents (public marketing) — THE INTELLIGENCE LAYER
 *
 * The hero IS the pitch: Immutable. Cryptographic. Distributed. In white, with a
 * living hash-chain as the show-stealer. This is AIOS, the layer under AISolar
 * and AITeam, sold to the buyer who would bring us an idea. It closes on an echo
 * of the same theme with a CTA to the blog (the full in-depth reads).
 *
 * Skills driving this: ui-ux-pro-max (Trust & Authority, spacious, motion rules),
 * marketing-psychology (authority + curiosity gap), copywriting + stop-slop
 * (no em dashes, no tricolon crutches, active voice). Colour: AIOS blue leads,
 * full family (blue / red / green / true-yellow). Truth-pass: no invented
 * metrics; the kernel detail stays withheld. Motion is reduced-motion gated.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';
import SEOHead from '@/components/SEOHead';

const TALK = 'https://cal.com/renewableireland/solar-consultation';

/** Open section — no box, no frame. Cal: lose the box. Content breathes on the
 *  page; the dark blocks and the big motion carry the structure instead. */
function Frame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={className}>{children}</section>;
}

/** Section eyebrow — the cal.com pill label. */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-2xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

/** Respect the user's motion preference — gates every animated element. */
function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduce;
}

/** Growing hash-chain — the immutability / cryptography motif and the hero's
 *  show-stealer, on WHITE. An append-only row of records, each hash-linked to the
 *  last, a signal running the chain, the newest block breathing. Motion gated. */
const CHAIN = [
  { hash: '0x9f3a', color: 'var(--pop)' },
  { hash: '0x2c8e', color: 'var(--doc-deposit)' },
  { hash: '0x71b4', color: 'var(--brand-accent)' },
  { hash: '0x0d52', color: 'var(--pop)' },
  { hash: '0xa6f1', color: 'var(--doc-deposit)' },
  { hash: '0x3e9c', color: 'var(--brand-accent)' },
  { hash: '0xf20b', color: 'var(--brand-aios)' },
] as const;

function HashChain() {
  const reduce = useReducedMotion();
  const N = CHAIN.length;
  const x0 = 44, gap = 96, y = 60, w = 34;
  const xs = CHAIN.map((_, i) => x0 + i * gap);
  return (
    <svg viewBox="0 0 720 120" className="w-full h-auto" role="img"
      aria-label="An append-only chain of records, each cryptographically linked to the one before it">
      {/* links between blocks */}
      {xs.slice(0, -1).map((x, i) => (
        <line key={`l-${i}`} x1={x + w} y1={y} x2={xs[i + 1]} y2={y}
          stroke="hsl(var(--foreground))" strokeOpacity={0.18} strokeWidth={1.5} />
      ))}
      {/* signal running the chain */}
      {!reduce && (
        <circle r={3.5} fill="hsl(var(--brand-aios))">
          <animateMotion path={`M ${xs[0] + w / 2} ${y} L ${xs[N - 1] + w / 2} ${y}`} dur="3.6s" repeatCount="indefinite" />
        </circle>
      )}
      {/* blocks + hashes */}
      {CHAIN.map((b, i) => {
        const newest = i === N - 1;
        return (
          <g key={`b-${i}`}>
            <rect x={xs[i]} y={y - 19} width={w} height={38} rx={6}
              fill={`hsl(${b.color})`} fillOpacity={newest ? 1 : 0.92}>
              {!reduce && newest && <animate attributeName="fill-opacity" values="1;0.65;1" dur="1.6s" repeatCount="indefinite" />}
            </rect>
            <text x={xs[i] + w / 2} y={y + 33} textAnchor="middle" fill="hsl(var(--muted-foreground))"
              fontSize="9" fontFamily="ui-monospace, monospace">{b.hash}</text>
          </g>
        );
      })}
    </svg>
  );
}

const HUB = { x: 360, y: 232 };
const NODES = [
  { x: 200, y: 92,  r: 9, color: 'var(--pop)',         label: 'AISolar', breathe: true },
  { x: 520, y: 92,  r: 9, color: 'var(--doc-deposit)', label: 'AITeam',  breathe: true },
  { x: 110, y: 188, r: 6, color: 'var(--brand-accent)' },
  { x: 620, y: 176, r: 6, color: 'var(--brand-accent)' },
  { x: 360, y: 74,  r: 6, color: 'var(--brand-accent)' },
] as const;

/** The family lattice — the "distributed" made visual. Products (red/green) and
 *  the verticals next (yellow) sit on the blue AIOS hub; signals flow in. */
function Lattice() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 720 300" className="w-full h-auto" role="img"
      aria-label="AISolar, AITeam and further verticals connected to the AIOS hub, with signals flowing to it">
      {Array.from({ length: 6 }).map((_, r) =>
        Array.from({ length: 15 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={40 + c * 46} cy={30 + r * 48} r={1.4} fill="hsl(var(--border))" opacity={0.5} />
        )),
      )}
      {NODES.map((n, i) => (
        <line key={`link-${i}`} x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y}
          stroke={n.label ? 'hsl(var(--brand-aios))' : 'hsl(var(--border))'}
          strokeOpacity={n.label ? 0.35 : 0.6} strokeWidth={1.25} />
      ))}
      {!reduce && NODES.map((n, i) => (
        <circle key={`sig-${i}`} r={3} fill={`hsl(${n.color})`}>
          <animateMotion path={`M ${n.x} ${n.y} L ${HUB.x} ${HUB.y}`} dur="2.6s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="2.6s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {NODES.map((n, i) => (
        <g key={`node-${i}`}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={`hsl(${n.color})`} opacity={n.label ? 1 : 0.9}>
            {!reduce && n.breathe && <animate attributeName="r" values={`${n.r};${n.r + 1.4};${n.r}`} dur="3s" repeatCount="indefinite" />}
          </circle>
          {n.label && <text x={n.x} y={n.y - 20} textAnchor="middle" className="fill-current text-foreground" fontSize="12" fontWeight="600">{n.label}</text>}
        </g>
      ))}
      {!reduce && (
        <circle cx={HUB.x} cy={HUB.y} r={26} fill="hsl(var(--brand-aios))" opacity={0.12}>
          <animate attributeName="r" values="20;30;20" dur="3.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.16;0.04;0.16" dur="3.2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={HUB.x} cy={HUB.y} r={15} fill="hsl(var(--brand-aios))" />
      <text x={HUB.x} y={HUB.y + 40} textAnchor="middle" className="fill-current text-foreground" fontSize="13" fontWeight="700">AIOS</text>
    </svg>
  );
}

const PILLARS = [
  { k: 'Immutable', v: 'Every action is written once to an append-only record. Nobody edits history here. You only add to it.' },
  { k: 'Cryptographic', v: 'Each entry is hash-linked to the one before it, so the chain is tamper-evident. Change a record and the maths stops matching.' },
  { k: 'Distributed', v: 'The intelligence is not one model in a box. It runs as agents reasoning in parallel, each accountable, all aimed at one goal.' },
];

export default function AgentsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEOHead
        title="The intelligence layer — AIOS"
        description="AIOS is the intelligence layer under AISolar and AITeam: immutable, cryptographically verifiable, and distributed across a runtime of agents. Built in Ireland. If you're building something of your own, this is the conversation to have."
        keywords="AIOS, immutable ledger, cryptographic audit trail, distributed AI agents, agent intelligence layer, custom AI agents Ireland, hash-chained record"
      />
      <MarketingNav product="aios" />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* ── HERO — Immutable. Cryptographic. Distributed. (white, show-stealer) ── */}
        <Frame className="px-6 pt-14 pb-10 sm:px-12 sm:pt-20 sm:pb-14 text-center">
          <Pill><span className="size-1.5 rounded-full bg-brand-aios" /> AIOS · the intelligence layer</Pill>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl sm:text-6xl lg:text-[76px] lg:leading-[1.02] font-semibold tracking-tight text-balance">
            Immutable. Cryptographic. Distributed.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground text-pretty">
            The layer under AISolar and AITeam. Every decision is reasoned, and every action is
            written where no one can change it. The part that matters is not in the feature list.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={TALK} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-control bg-brand-aios px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity duration-instant">
              Bring an idea <ArrowUpRight className="size-4" />
            </a>
            <Link to="/aisolar"
              className="inline-flex h-11 items-center gap-2 rounded-control px-5 text-sm font-medium text-foreground hover:bg-muted transition-colors duration-instant">
              See it running <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mx-auto mt-14 max-w-3xl"><HashChain /></div>
        </Frame>

        {/* ── The three, spelled out ────────────────────────────────────── */}
        <Frame className="p-6 sm:p-10">
          <div className="grid gap-8 sm:grid-cols-3">
            {PILLARS.map(p => (
              <div key={p.k}>
                <h2 className="text-lg font-semibold">{p.k}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{p.v}</p>
              </div>
            ))}
          </div>
        </Frame>

        {/* ── Distributed, made visual — the family lattice ─────────────── */}
        <Frame className="py-8 sm:py-14 text-center">
          <Pill>Under everything</Pill>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">One layer. Every product runs on it.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-muted-foreground text-pretty">
            AISolar and AITeam are what most people see. Both run on AIOS, on the same kernel,
            each tenant walled off from the rest. So will the verticals coming next.
          </p>
          <div className="mx-auto mt-10 max-w-4xl"><Lattice /></div>
          <div className="mx-auto mt-8 grid max-w-3xl gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'AISolar', role: 'the installer OS', dot: 'bg-pop' },
              { name: 'AITeam', role: 'the ten agents', dot: 'bg-doc-deposit' },
              { name: 'Your vertical', role: 'next, same kernel', dot: 'bg-brand-accent' },
              { name: 'AIOS', role: 'the intelligence', dot: 'bg-brand-aios' },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-3 rounded-control border border-border bg-card px-4 py-3 text-left">
                <span className={`size-2.5 rounded-full ${s.dot}`} />
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="ml-auto text-2xs text-muted-foreground">{s.role}</span>
              </div>
            ))}
          </div>
        </Frame>

        {/* ── What's not said — the intrigue (dark) ─────────────────────── */}
        <div className="rounded-panel bg-foreground px-6 py-14 sm:px-14 sm:py-20 text-background">
          <p className="text-2xs font-medium uppercase tracking-[0.14em] text-background/50">What we don't explain here</p>
          <h2 className="mt-4 max-w-2xl text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-balance">
            How it stays grounded and honest is the part we keep off the website.
          </h2>
          <p className="mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-background/70 text-pretty">
            A layer underneath decides what's true before anything acts on it. That is why you can
            trust what comes out, and it is the part we leave off the page. If you want to know how
            it works, you ask.
          </p>
        </div>

        {/* ── Authority / proof — truth-pass, no invented numbers ──────────── */}
        <Frame className="p-6 sm:p-10">
          <Pill>Why it can be trusted</Pill>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {[
              { k: 'It runs a real business today', v: 'AISolar runs on it now, from the first bill to the final install.' },
              { k: 'Everything is on the record', v: 'Every action is hash-chained and written in plain English. Nothing sends without a person.' },
              { k: 'Built in Ireland, to keep', v: 'EU data residency and GDPR tooling, built in from the first line.' },
            ].map(p => (
              <div key={p.k}>
                <h3 className="text-sm font-semibold">{p.k}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{p.v}</p>
              </div>
            ))}
          </div>
        </Frame>

        {/* ── BOTTOM — echo the theme, CTA to the blog ──────────────────── */}
        <div className="rounded-panel border border-brand-aios/25 bg-brand-aios-subtle px-6 py-14 sm:px-14 sm:py-20 text-center">
          <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Go deeper</p>
          <h2 className="mx-auto mt-4 max-w-xl text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-balance">
            The full version, written out.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm sm:text-base leading-relaxed text-muted-foreground text-pretty">
            We put the whole thing in writing: how the intelligence layer works, and what AISolar,
            AIField and the verticals coming next are built on. Read it before you talk to us.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/blog"
              className="inline-flex h-11 items-center gap-2 rounded-control bg-brand-aios px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity duration-instant">
              Read the breakdown <ArrowRight className="size-4" />
            </Link>
            <a href={TALK} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-control px-6 text-sm font-medium text-foreground hover:bg-muted transition-colors duration-instant">
              Bring an idea <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </main>

      <MarketingFooter product="aios" />
    </div>
  );
}
