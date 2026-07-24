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
    title: 'The SEAI solar grant in 2026: what you actually get',
    description: 'The SEAI solar grant pays €700/kWp for the first 2 kWp, then €200/kWp to 4 kWp — capped at €1,800. Here is how it is calculated and claimed.',
    excerpt: 'Most homeowners are told "up to €1,800" and left to guess. Here is the actual calculation, the cap, and the two conditions people trip over.',
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
    title: 'Your day/night split decides your solar system',
    description: 'A day/night meter shows when you actually use electricity. That split — not your roof size — is what decides your solar system and whether a battery pays.',
    excerpt: 'Two homes with identical roofs and identical bills can need very different systems. The difference is when the power gets used.',
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
    title: 'What solar costs in Ireland — and when it pays for itself',
    description: 'Typical Irish solar payback runs 5–7 years. Here is what drives the number up or down, and how to check a payback claim before you sign.',
    excerpt: 'Payback is the number everyone asks for and the easiest one to fudge. Here is how it is actually built.',
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
    title: 'Registering solar with ESB Networks: NC6, NC7 and what they are for',
    description: 'Home solar must be registered with ESB Networks before it can export. Here is which form applies, who submits it, and why it gates your export payments.',
    excerpt: 'The paperwork nobody explains, in plain English — and the reason it decides whether you get paid for what you export.',
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
        h: 'What a homeowner should keep',
        p: [
          'Ask for a copy of the submitted notification, the electrical certification for the work, and the datasheets for the panels and inverter. Together they are what you will want if you ever sell the house, make a warranty claim, or query an export payment.',
          'A good installer hands these over without being asked, as a pack, at handover. If you have to chase them afterwards, that tells you something about how the rest of the job was run.',
        ],
      },
    ],
    sources: [
      { label: 'ESB Networks — microgeneration and forms', href: 'https://www.esbnetworks.ie' },
      { label: 'SEAI — Solar Electricity Grant', href: 'https://www.seai.ie' },
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find(a => a.slug === slug);
