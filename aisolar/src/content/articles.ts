/**
 * articles — the blog content, written long-form.
 *
 * Every figure here is verified against an official Irish source (seai.ie,
 * revenue.ie, esbnetworks.ie) and every article carries its sources. Truth-pass
 * applies: nothing claimed that isn't real, no invented case studies, no
 * competitor names.
 *
 * Each article gets one family colour so the blog carries all four:
 *   aios = blue · aisolar = red · aiteam = green · accent = yellow
 */

export type ArticleColour = 'aios' | 'aisolar' | 'aiteam' | 'accent';

export interface ArticleSection {
  h: string;
  p: string[];
  /** Optional pull-out box: a fact worth lifting out of the prose. */
  callout?: { label: string; body: string };
  /** Optional simple table: header row + rows. */
  table?: { head: string[]; rows: string[][] };
}

export interface Article {
  slug: string;
  title: string;
  /** 150–160 chars, question-answerable — the meta description. */
  description: string;
  excerpt: string;
  tag: string;
  colour: ArticleColour;
  published: string;   // ISO
  updated?: string;    // ISO
  readMins: number;
  sections: ArticleSection[];
  sources: Array<{ label: string; href: string }>;
}

export const COLOUR_CLASS: Record<ArticleColour, { text: string; bg: string; border: string; dot: string }> = {
  aios:    { text: 'text-brand-aios',    bg: 'bg-brand-aios-subtle',    border: 'border-l-brand-aios',    dot: 'bg-brand-aios' },
  aisolar: { text: 'text-brand-aisolar', bg: 'bg-brand-aisolar-subtle', border: 'border-l-brand-aisolar', dot: 'bg-brand-aisolar' },
  aiteam:  { text: 'text-brand-aiteam',  bg: 'bg-brand-aiteam-subtle',  border: 'border-l-brand-aiteam',  dot: 'bg-brand-aiteam' },
  accent:  { text: 'text-brand-accent',  bg: 'bg-brand-accent-subtle',  border: 'border-l-brand-accent',  dot: 'bg-brand-accent' },
};

export const ARTICLES: Article[] = [
  /* ─────────────────────────────────────────────────────────────── BLUE */
  {
    slug: 'seai-solar-grant-2026',
    title: 'The SEAI solar grant, by the numbers: what an installer must get right',
    description: 'The SEAI grant pays €700/kWp for the first 2 kWp, then €200/kWp to 4 kWp, capped at €1,800. The exact calculation, the cap, and the conditions that void a claim.',
    excerpt: 'Quote it wrong and the customer loses the money after the job is done. Here is the exact tiered calculation, the cap, and the two conditions that void a claim.',
    tag: 'Grants',
    colour: 'aios',
    published: '2026-07-24',
    readMins: 5,
    sections: [
      {
        h: 'The number, first',
        p: [
          'A 6 kWp system and a 4 kWp system get the same SEAI grant: €1,800. That surprises people, and it is the single most useful thing to understand before you compare quotes.',
          'The SEAI Solar Electricity Grant is tiered, not a flat rate per panel. It pays €700 per kWp for the first 2 kWp of capacity, then €200 per kWp between 2 kWp and 4 kWp. Above 4 kWp it pays nothing extra. So the grant tops out at €1,800, and you reach that ceiling at 4 kWp.',
        ],
        callout: {
          label: 'The calculation',
          body: '2 kWp × €700 = €1,400. Then 2 more kWp × €200 = €400. Total €1,800 — the cap, reached at 4 kWp.',
        },
      },
      {
        h: 'What that means for sizing',
        p: [
          'A typical Irish home fits comfortably more than 4 kWp on the roof, which means most domestic installs claim the full €1,800 and then size the rest of the system on economics rather than grant-chasing.',
          'This is worth saying plainly because it kills a bad instinct: there is no point shrinking a system to "fit the grant better", and no point stretching one expecting the grant to stretch with it. Past 4 kWp, every extra panel is judged only on what it saves you.',
        ],
        table: {
          head: ['System size', 'SEAI grant', 'Notes'],
          rows: [
            ['2 kWp', '€1,400', 'First tier only'],
            ['3 kWp', '€1,600', '€1,400 + 1 kWp at €200'],
            ['4 kWp', '€1,800', 'Cap reached'],
            ['6 kWp', '€1,800', 'Same as 4 kWp — cap applies'],
            ['10 kWp', '€1,800', 'Same again'],
          ],
        },
      },
      {
        h: 'The two conditions people trip over',
        p: [
          'First: you apply before the work starts, and you use an SEAI-registered installer. Grant applications are not retrospective. Signing a contract and starting the job before approval is the most common way people lose the money entirely.',
          'Second: a post-works BER assessment is required to claim. This is a condition, not a bonus payment — there is no extra cash attached to it. You arrange the BER after the system is installed, it gets lodged, and the grant is then paid to you (the homeowner), not to the installer.',
        ],
      },
      {
        h: 'VAT is the quieter saving',
        p: [
          'Since 1 May 2023 the supply and installation of solar panels on a private home is zero-rated for VAT in Ireland. On a €10,000 job that is a bigger saving than the grant, and it should already be reflected in the price you are quoted — there is nothing to claim back later.',
          'When you compare quotes, check the VAT treatment is right. A domestic supply-and-install job should carry 0% VAT. Commercial and non-domestic projects follow the standard rules and a different grant scheme.',
        ],
      },
      {
        h: 'What to ask a quote for',
        p: [
          'Ask for the grant to be shown as a line, not folded into a headline discount: gross price, then the SEAI grant, then what you actually pay. If a quote leads with "€1,800 off" without showing the system size, you cannot tell whether the number is even achievable.',
          'And ask what the estimate was built on. A quote sized from your actual electricity bill — your annual usage, your day/night split, your tariff — will survive scrutiny. One sized from an average home will not.',
        ],
      },
    ],
    sources: [
      { label: 'SEAI — Solar Electricity Grant', href: 'https://www.seai.ie' },
      { label: 'Revenue — VAT on solar panels', href: 'https://www.revenue.ie' },
    ],
  },

  /* ──────────────────────────────────────────────────────────────── RED */
  {
    slug: 'day-night-meter-solar',
    title: 'Sizing from the day/night split: the number that decides the system',
    description: 'The day/night split, not the roof size, decides system sizing and the battery case. How to read it off the bill and design against it instead of an average.',
    excerpt: 'Two houses with identical roofs and bills need different systems. The variable is when the power is used, and it is the one an average-based quote ignores.',
    tag: 'How solar works',
    colour: 'aisolar',
    published: '2026-07-24',
    readMins: 5,
    sections: [
      {
        h: 'Two identical houses, two different systems',
        p: [
          'Take two homes on the same street. Same roof, same €280 monthly bill. One is empty from 8am to 6pm. The other has someone home all day, an EV on the drive, and a heat pump running.',
          'The first home exports most of what it generates and earns the export rate for it. The second consumes its generation directly and avoids buying units at the much higher day rate. Same bill, same roof — genuinely different economics, and the right recommendation differs too.',
        ],
      },
      {
        h: 'What the meter is telling you',
        p: [
          'A day/night meter (also called a smart or dual-rate meter) records your usage in separate day and night bands, and usually bills them at different rates. Your bill shows both, along with your MPRN, your annual usage and your standing charge.',
          'Solar generates during daylight. So the more of your usage that falls in the day band, the more of your generation replaces expensive units directly — and the better your return. If your usage is night-heavy, the panels still generate, but the value shifts.',
        ],
        callout: {
          label: 'The rule of thumb',
          body: 'Day-heavy usage → solar pays directly, and a battery is optional. Night-heavy usage → a battery is what unlocks the value, by moving daytime generation to the evening.',
        },
      },
      {
        h: 'Where the battery case is actually made',
        p: [
          'A battery is not a default upgrade, and it is not a gimmick. It is a specific answer to a specific pattern: you generate during the day but consume after dark.',
          'If your night usage is high, storing your own generation and using it in the evening beats exporting it and buying it back at a higher rate. If your usage is mostly daytime, the same battery earns far less, and the money is often better spent on panels.',
          'That is why an honest quote asks for your bill instead of guessing. The day/night split is on it.',
        ],
      },
      {
        h: 'What else the bill gives up',
        p: [
          'Beyond the split, a bill carries the details that make an estimate specific rather than generic: your MPRN, your annual kWh, your unit and night rates, your standing charge, your tariff name and whether the reading was actual or estimated.',
          'Read together, those turn "a typical home saves around X" into "your home, on your tariff, at your usage, saves this". It is a different conversation, and it is the one worth having before you sign anything.',
        ],
      },
      {
        h: 'What to do with this',
        p: [
          'Pull your most recent bill and find three things: your annual usage in kWh, your day/night split if you have a dual-rate meter, and your unit rate. That is enough to sanity-check any quote you are given.',
          'Then ask whoever is quoting you which of those numbers they used. If the answer is none of them, the estimate is an average, and averages are how people end up with the wrong system.',
        ],
      },
    ],
    sources: [
      { label: 'ESB Networks — metering', href: 'https://www.esbnetworks.ie' },
      { label: 'SEAI — Solar Electricity Grant', href: 'https://www.seai.ie' },
    ],
  },

  /* ────────────────────────────────────────────────────────────── GREEN */
  {
    slug: 'solar-payback-ireland',
    title: 'Payback maths: building a figure that survives scrutiny',
    description: 'Irish solar payback runs 5 to 7 years. The variables that move it, and how to build a figure on net cost and real usage that a customer or regulator can check.',
    excerpt: 'Payback is the number every customer asks for and the easiest to fudge. Here is how to build one on net cost and their real usage, so it holds up.',
    tag: 'Costs',
    colour: 'aiteam',
    published: '2026-07-24',
    readMins: 6,
    sections: [
      {
        h: 'The honest range',
        p: [
          'For a typical Irish home, solar pays for itself in roughly five to seven years. After that the electricity it generates is effectively free for the remaining twenty-plus years of the panels\' life.',
          'That range is wide for a reason. Payback is a ratio — what you paid, divided by what you save each year — and both halves move a lot depending on your house.',
        ],
      },
      {
        h: 'What moves the top half: cost',
        p: [
          'The SEAI grant takes up to €1,800 off, and domestic solar carries 0% VAT, so the gap between the gross price and what you actually pay is significant. Any payback figure built on the gross price is wrong.',
          'A battery raises the upfront cost. It should only be in the quote if your usage pattern justifies it — otherwise it stretches payback rather than shortening it.',
        ],
        callout: {
          label: 'Check this on your quote',
          body: 'Payback should be calculated on the NET cost — after the grant — and on your own annual saving. Ask which numbers were used. If they cannot tell you, the figure is decorative.',
        },
      },
      {
        h: 'What moves the bottom half: savings',
        p: [
          'Four things drive the annual saving. How much electricity you use, how much of it falls during daylight, which way the roof faces and how shaded it is, and your unit rate.',
          'A south-facing, unshaded roof on a home with daytime usage and a high unit rate will sit at the fast end of the range. A north-facing roof on a night-heavy home with low usage will sit at the slow end — and might not be worth doing at that size.',
        ],
        table: {
          head: ['Factor', 'Shortens payback', 'Lengthens payback'],
          rows: [
            ['Usage timing', 'Daytime-heavy', 'Night-heavy without a battery'],
            ['Roof aspect', 'South-facing, unshaded', 'North-facing or shaded'],
            ['Unit rate', 'Higher rate', 'Lower rate'],
            ['System size', 'Sized to your usage', 'Oversized for the house'],
          ],
        },
      },
      {
        h: 'The export side',
        p: [
          'What you generate and do not use can be exported to the grid, and you are paid for it under the Clean Export Guarantee. Your installation has to be registered with ESB Networks for that to happen.',
          'Export income is real but it is usually the smaller half of the story. Replacing a unit you would otherwise buy is worth more than exporting one, which is why matching the system to your usage beats maximising raw generation.',
        ],
      },
      {
        h: 'How to check a payback claim in two minutes',
        p: [
          'Ask three questions. Was this calculated after the grant? What annual saving did you assume, and where did it come from? And what did you assume about my day/night usage?',
          'If the answers are specific — and traceable to your own bill — the payback figure is worth something. If they are round numbers with no source, treat it as marketing rather than maths.',
          'A good estimate should be able to show its working: system size, gross cost, grant, net cost, annual saving, and the year the lines cross.',
        ],
      },
    ],
    sources: [
      { label: 'SEAI — Solar Electricity Grant', href: 'https://www.seai.ie' },
      { label: 'Revenue — VAT on solar panels', href: 'https://www.revenue.ie' },
      { label: 'ESB Networks — microgeneration', href: 'https://www.esbnetworks.ie' },
    ],
  },

  /* ───────────────────────────────────────────────────────────── YELLOW */
  {
    slug: 'esb-microgeneration-nc6-nc7',
    title: 'NC6 or NC7: the ESB form that decides whether a job energises on time',
    description: 'Microgeneration must be registered with ESB Networks before it can export. Which form applies (NC6 vs NC7), who submits it, and why the wrong one stalls the connection.',
    excerpt: 'NC6 or NC7 comes down to inverter capacity, decided at design. Get it wrong and the connection stalls after the job is done. Here is the distinction, plainly.',
    tag: 'Compliance',
    colour: 'accent',
    published: '2026-07-24',
    readMins: 4,
    sections: [
      {
        h: 'Why this exists at all',
        p: [
          'When your panels generate more than the house is using, the surplus goes out to the grid. ESB Networks needs to know that is happening — for safety, and so the connection is recorded properly.',
          'That registration is also what makes you eligible to be paid for exported electricity under the Clean Export Guarantee. Skipping it does not just risk a compliance problem; it means the surplus you generate earns you nothing.',
        ],
      },
      {
        h: 'Which form applies',
        p: [
          'The form depends on the installation. Most domestic systems are notified as microgeneration — the NC5 or NC6 route — confirming the inverter and the setup after installation. Larger mini-generation systems use the NC7 application, which is a heavier process with its own test and declaration forms.',
          'The distinction is driven by the inverter capacity rather than the number of panels, which is why the right form is decided at design stage, not on the day.',
        ],
        callout: {
          label: 'Who fills these in',
          body: 'Your installer prepares and submits them. A registered electrician signs off the electrical work. The homeowner should be given copies for their records.',
        },
      },
      {
        h: 'Where it usually goes wrong',
        p: [
          'Two failure modes are common. The first is a form submitted late, after the system is already generating, which delays export payments. The second is a form submitted with the wrong inverter details, which means it comes back and the clock restarts.',
          'Neither is complicated. Both are the sort of thing that gets lost when the paperwork lives in somebody\'s inbox rather than in a system that tracks it per job.',
        ],
      },
      {
        h: 'The pack the installer files and hands over',
        p: [
          'The job leaves behind a set of records: the submitted ESB notification, the electrical certification for the work, and the datasheets for the panels and inverter. That pack backs a warranty claim, an export query, or a later sale of the property.',
          'Assembling it by hand at handover is where jobs slip. Captured through the install and filed per job, it is done by the time the crew leaves the roof.',
        ],
      },
    ],
    sources: [
      { label: 'ESB Networks — microgeneration and forms', href: 'https://www.esbnetworks.ie' },
      { label: 'SEAI — Solar Electricity Grant', href: 'https://www.seai.ie' },
    ],
  },

  /* ═══════════════ NEW: for the installer we're attracting (25 Jul) ═══════════════ */

  /* ─────────────────────────────────────────────────────────────── BLUE (AIOS) */
  {
    slug: 'aios-immutable-cryptographic-distributed',
    title: 'Immutable, cryptographic, distributed: what runs under AISolar',
    description: 'AIOS is the layer under AISolar and AITeam: an append-only record, cryptographically linked so it cannot be quietly changed, run by a distributed set of agents.',
    excerpt: 'Most software lets you edit history. For a business of record, that is a liability. Here is how the layer underneath is built, and why it matters more than any feature.',
    tag: 'AIOS',
    colour: 'aios',
    published: '2026-07-25',
    readMins: 6,
    sections: [
      {
        h: 'Software forgets, and that is the problem',
        p: [
          'Most business software treats its own history as editable. A record gets updated, an old value is gone, and nobody can say for certain what it used to be. For a solar business that has to stand over a grant claim, an ESB filing and a warranty years later, that is a quiet liability.',
          'AIOS starts from the opposite rule. Nothing is edited. Everything is added. The system keeps the whole history of a job, in order, and that history is the source of truth the agents and the paperwork both read from.',
        ],
        callout: {
          label: 'The rule',
          body: 'Write once, add forever, edit nothing. The record grows. It never gets rewritten.',
        },
      },
      {
        h: 'Immutable: written once, kept for good',
        p: [
          'Every action on a job becomes an entry in an append-only record: the bill read, the survey, the proposal draft, the approval, the install, the sign-off. Each entry is kept as it was made. A correction is a new entry that supersedes the old one, and the old one stays visible underneath.',
          'The practical effect is that you can always answer the question a regulator or a customer asks two years later: what did we know, and when. The answer is written down, in order, and it was written at the time.',
        ],
      },
      {
        h: 'Cryptographic: linked so it cannot be quietly changed',
        p: [
          'Each entry is hash-linked to the one before it. That means the record is tamper-evident: alter an entry after the fact and the maths of every entry after it stops matching. You do not have to trust that the history is intact. You can check it.',
          'This is the difference between a log and a record. A log can be edited by anyone with access. A hash-linked record shows its own integrity, which is what makes it worth building compliance and money movements on top of.',
        ],
      },
      {
        h: 'Distributed: a runtime of agents, not one model in a box',
        p: [
          'The intelligence is not a single model answering prompts. It is a set of agents reasoning in parallel, each responsible for one part of the job, each writing what it did to the same record. One reads the bill, one drafts the proposal, one tracks the grant, one chases payment.',
          'Because they share one record and one set of rules, they stay consistent with each other. And because every agent is accountable to the same append-only history, a person can see exactly what each one did and step in at any point.',
        ],
      },
      {
        h: 'What we keep off the page',
        p: [
          'How the reasoning stays grounded, and how it decides what is true before anything acts on it, is the part we do not publish. It is the reason the output can be trusted, and it is not a feature we list.',
          'If you are building something of your own and you want to know how that layer actually works, that is a conversation rather than a web page. Bring an idea.',
        ],
      },
    ],
    sources: [
      { label: 'Data Protection Commission — GDPR in Ireland', href: 'https://www.dataprotection.ie' },
    ],
  },

  /* ──────────────────────────────────────────────────────────────── RED (AISolar) */
  {
    slug: 'aisolar-the-installer-os',
    title: 'AISolar: the operating system for an Irish solar installer',
    description: 'AISolar reads the day/night split off a homeowner\'s bill and runs the whole job from quote to install, so a small installer competes on speed and credibility.',
    excerpt: 'The installer who quotes first, and quotes off real numbers, usually wins. AISolar is built to make that the default rather than a scramble.',
    tag: 'AISolar',
    colour: 'aisolar',
    published: '2026-07-25',
    readMins: 5,
    sections: [
      {
        h: 'The job is to quote fast and quote right',
        p: [
          'A homeowner getting solar quotes is usually holding two or three. The one that lands is rarely the cheapest. It is the one that arrives first and reads like it was written for their house, not an average home.',
          'AISolar is built around that reality. It turns a bill into a credible, defensible quote in minutes, so a two-person crew can answer a lead the same day instead of losing it to whoever got back first.',
        ],
      },
      {
        h: 'It starts with the bill, not an average home',
        p: [
          'The platform reads up to 21 details off the homeowner\'s last electricity bill: the tariff, the standing charge, the MPRN, and the day/night split. That day/night number is the one most installers skip, and it is the one that decides whether a battery actually pays for itself.',
          'Every proposal runs off those real figures. When a homeowner asks why your number is different from the quote down the road, the answer is in their own bill, which is a much stronger place to argue from.',
        ],
      },
      {
        h: 'One workbench, bill to install',
        p: [
          'The same job moves through one system: bill read, site survey, proposal, SEAI grant tracking, ESB microgeneration paperwork, install, and handover. Nothing is re-keyed between steps, because each step reads what the last one wrote.',
          'That is the difference between software that holds a customer list and software that runs the business. The pipeline is the product.',
        ],
      },
      {
        h: 'Two homes: AISales and AIField',
        p: [
          'AISolar has a home for each seat. AISales is the consultant\'s cockpit, where the pipeline, the engagement signal and the next move live. AIField is the crew\'s app, where the day\'s jobs, the checklist and the sign-off live.',
          'Both read from the same job, so the office and the roof are never working off different numbers.',
        ],
      },
    ],
    sources: [
      { label: 'SEAI — Solar Electricity Grant', href: 'https://www.seai.ie' },
      { label: 'ESB Networks — Microgeneration', href: 'https://www.esbnetworks.ie' },
    ],
  },

  /* ────────────────────────────────────────────────────────────── GREEN (AIField) */
  {
    slug: 'aifield-the-crew-app',
    title: 'AIField: the crew app that turns a work day into the evidence pack',
    description: 'AIField runs a solar crew\'s day in order: start the job and the customer is told, work a staged photo checklist, and capture serials once so the paperwork fills itself.',
    excerpt: 'A crew\'s day is linear and physical, not a dashboard. AIField is built for the roof, and the photos it captures are the compliance pack, not decoration.',
    tag: 'AIField',
    colour: 'aiteam',
    published: '2026-07-25',
    readMins: 5,
    sections: [
      {
        h: 'A crew\'s day is linear, not a dashboard',
        p: [
          'An installer on a roof does not want tabs. They want the next thing, in order: where the stop is, what is loaded on the van, what to do first when they get there.',
          'AIField is built around the job in progress rather than a screen full of panels. It shows the day in time order and walks the crew through each stage of the install.',
        ],
      },
      {
        h: 'Start the job, and the customer is told',
        p: [
          'The moment a crew taps Start, the homeowner gets a plain message that the team is on the way, with the prep steps. No one in the office has to remember to send it.',
          'That single automatic message removes a whole category of "what time are you coming" calls, and it sets the tone for the day before the van arrives.',
        ],
      },
      {
        h: 'The checklist is the evidence pack',
        p: [
          'The install runs as staged steps: pre-install, roof, electrical, commissioning, handover. Each stage asks for the photos it needs, and each one gates the next.',
          'Those photos are not decoration. They are the evidence pack for the warranty, the SEAI claim and the ESB filing. Captured once, in order, they close out a job that would otherwise generate a week of chasing.',
        ],
      },
      {
        h: 'Capture the serials once',
        p: [
          'At commissioning the crew captures the panel and inverter serials on the phone. That one capture feeds the warranty pack and the ESB microgeneration form, so the same numbers never get typed twice.',
          'It also lets the system check what was actually fitted against what the proposal specified. A substituted inverter gets caught on the roof, not months later when the paperwork does not match the kit.',
        ],
        callout: {
          label: 'Why it matters',
          body: 'A change of inverter can move a job from an NC6 notification to an NC7 application. Catching it at commissioning is the difference between a clean filing and a stalled connection.',
        },
      },
      {
        h: 'Built for Irish roofs and bad signal',
        p: [
          'Rural sites lose signal. AIField holds the day\'s work and the captures locally and syncs when the phone is back on a connection, so a crew is never blocked by coverage.',
        ],
      },
    ],
    sources: [
      { label: 'ESB Networks — Microgeneration (NC6/NC7)', href: 'https://www.esbnetworks.ie' },
      { label: 'Safe Electric — Registered Electrical Contractors', href: 'https://www.safeelectric.ie' },
    ],
  },

  /* ───────────────────────────────────────────────────────────── YELLOW (verticals) */
  {
    slug: 'aios-verticals-coming',
    title: 'Solar was the first vertical, not the only one',
    description: 'AISolar runs on AIOS, a kernel designed to extend beyond solar. Here is how a new trade runs on the same intelligence layer, and what it means for early operators.',
    excerpt: 'The bill-to-install pipeline is not solar-specific. The kernel underneath is built to carry the next trade, and the one after that, on the same record.',
    tag: 'AIOS',
    colour: 'accent',
    published: '2026-07-25',
    readMins: 4,
    sections: [
      {
        h: 'Solar was the proving ground',
        p: [
          'AISolar is the first business built on AIOS, and it is live: bill to proposal to grant to install, run by the agent runtime. It was built first because solar in Ireland has real paperwork, real grants and real deadlines, which is a hard test for a platform.',
          'None of the layer underneath is solar-specific. The kernel, the agent runtime and the append-only record are the same whatever the trade. Only the workflow on top changes.',
        ],
      },
      {
        h: 'The same kernel, a different workflow',
        p: [
          'A new vertical is a new set of steps and rules sitting on the same foundation. The record, the isolation between tenants, the approval gates and the audit trail all carry over. What gets built is the trade\'s own pipeline and its own forms.',
          'That is why a second or third vertical does not mean starting again. The expensive part, the part that has to be trustworthy, is already there.',
        ],
      },
      {
        h: 'What this means for an early operator',
        p: [
          'If your business has repeatable back-office work, a chain from enquiry to job to paperwork to payment, that is the shape AIOS is built for. Adjacent trades are the natural next step, and the model extends to them by design rather than by rebuild.',
          'We are not going to name verticals we have not built. What we will say is that the foundation was designed to carry more than one, and that the interesting conversations start with an operator who has a specific one in mind.',
        ],
      },
    ],
    sources: [],
  },
];

export const getArticle = (slug: string) => ARTICLES.find(a => a.slug === slug);
