/**
 * Product catalogue — the gear that appears on customer proposals.
 *
 * Cal: "allow to add product images." Drop a real photo URL (or /products/x.png
 * in /public) into `image` and it appears on every proposal that quotes that
 * model. Until then a branded placeholder renders — never a broken image.
 */
export interface CatalogProduct {
  model: string;
  kind: 'panel' | 'inverter' | 'battery' | 'diverter' | 'charger';
  maker: string;
  /** headline spec the homeowner understands */
  spec: string;
  warrantyYears: number;
  /** panels only — real dimensions (metres) and wattage. The Design Studio draws
      the array to widthM × heightM so the footprint is accurate, and uses watts
      for kWp. Every panel model is a different size, so these live per product. */
  widthM?: number;
  heightM?: number;
  watts?: number;
  /** installed price (EUR). Panels/inverter/battery still price via the per-kWp
      model in pricing.ts today; add-ons (diverter/charger) price per unit here. */
  price?: number;
  /** real product photo — /public path or https URL */
  image?: string;
  /** manufacturer data sheet — /public PDF path or https URL. Renders a
      "Data sheet" link on proposals when present; hidden when absent, so
      no dead links ever ship (Cal: data sheets add value). */
  datasheet?: string;
  blurb: string;
}

const CATALOG: CatalogProduct[] = [
  {
    model: 'JA Solar 435W', kind: 'panel', maker: 'JA Solar',
    spec: '435 W · all-black mono', warrantyYears: 25,
    widthM: 1.134, heightM: 1.762, watts: 435,
    blurb: 'Tier-1 panels with 25-year performance warranty — still ≥84.5% output in year 25.',
  },
  {
    model: 'TrinaSolar TSM-440 NEG9RC.28', kind: 'panel', maker: 'TrinaSolar',
    spec: '440 W · Vertex S+ · dual-glass', warrantyYears: 25,
    widthM: 1.134, heightM: 1.762, watts: 440,
    datasheet: '/datasheets/trinasolar-tsm-440-neg9rc28.pdf',
    blurb: 'Vertex S+ dual-glass — the datasheet the BER assessor needs ships with your proposal.',
  },
  {
    model: 'SolaX X1-Hybrid-5.0 G4', kind: 'inverter', maker: 'SolaX',
    spec: '5 kW hybrid · battery-ready', warrantyYears: 10,
    blurb: 'Hybrid inverter proven on Irish domestic installs — panels, battery and export in one unit.',
  },
  {
    model: 'Longi 430W', kind: 'panel', maker: 'LONGi',
    spec: '430 W · all-black mono', warrantyYears: 25,
    widthM: 1.134, heightM: 1.722, watts: 430,
    blurb: 'Tier-1 manufacturer, proven Irish-climate performance in low light.',
  },
  {
    model: 'Sigenergy SigenStor 8kW', kind: 'inverter', maker: 'Sigenergy',
    spec: '8 kW hybrid · battery-ready', warrantyYears: 10,
    blurb: 'Hybrid inverter that manages panels, battery and grid export in one unit.',
  },
  {
    model: 'SolaX X1-Hybrid-6.0 G4', kind: 'inverter', maker: 'SolaX',
    spec: '6 kW hybrid · battery-ready', warrantyYears: 10,
    blurb: 'Bigger hybrid for larger roofs — panels, Triple Power battery and export in one unit.',
  },
  {
    model: 'SolaX Triple Power T-BAT 5.8kWh', kind: 'battery', maker: 'SolaX',
    spec: '5.8 kWh · stackable LFP', warrantyYears: 10,
    blurb: 'Stores your cheap night-rate or excess solar for the expensive evening peak. Stacks to 23 kWh.',
  },
  {
    model: 'SolaX Triple Power 11.6kWh (2×5.8)', kind: 'battery', maker: 'SolaX',
    spec: '11.6 kWh · 2-module LFP stack', warrantyYears: 10,
    blurb: 'Two-module stack — evening cover for most homes, headroom for the heat pump or EV.',
  },
  {
    model: 'Sigenergy 8kWh', kind: 'battery', maker: 'Sigenergy',
    spec: '8 kWh · stackable LFP', warrantyYears: 10,
    blurb: 'Stores your cheap night-rate or excess solar for the expensive evening peak.',
  },
  {
    model: 'BYD HVS 10.2', kind: 'battery', maker: 'BYD',
    spec: '10.2 kWh · LFP', warrantyYears: 10,
    blurb: 'LFP chemistry — safe, long-life storage sized for Irish evening usage.',
  },
  {
    model: 'myenergi Eddi', kind: 'diverter', maker: 'myenergi',
    spec: 'hot-water diverter · 2 loads', warrantyYears: 3, price: 395,
    blurb: 'Sends excess solar to the immersion instead of the grid — free hot water.',
  },
  {
    model: 'Marlec iBoost Solar', kind: 'diverter', maker: 'Marlec',
    spec: 'hot-water diverter', warrantyYears: 5, price: 345,
    blurb: 'Diverts surplus solar to the immersion tank so it is not exported for pennies.',
  },
  {
    model: 'myenergi Zappi', kind: 'charger', maker: 'myenergi',
    spec: '7 kW · solar-aware', warrantyYears: 3, price: 895,
    blurb: 'Charges the car off the roof — eco mode uses only surplus solar.',
  },
  {
    model: 'Ohme ePod', kind: 'charger', maker: 'Ohme',
    spec: '7 kW · smart-tariff', warrantyYears: 3, price: 795,
    blurb: 'Smart charging that leans on cheap night rates and surplus solar.',
  },
];

// Default product imagery — clean per-kind illustrations (/public/products).
// A real photo set on the product (or uploaded on the Products page) wins;
// these guarantee no proposal or picker ever shows an empty grey box.
const KIND_IMAGE: Record<CatalogProduct['kind'], string> = {
  panel: '/products/panel.svg',
  inverter: '/products/inverter.svg',
  battery: '/products/battery.svg',
  diverter: '/products/diverter.svg',
  charger: '/products/charger.svg',
};
CATALOG.forEach(p => { if (!p.image) p.image = KIND_IMAGE[p.kind]; });

const KIND_DEFAULT: Record<CatalogProduct['kind'], Omit<CatalogProduct, 'model'>> = {
  panel:    { kind: 'panel', maker: '', spec: 'Tier-1 mono panel', warrantyYears: 25, blurb: 'Tier-1 solar panel with 25-year performance warranty.' },
  inverter: { kind: 'inverter', maker: '', spec: 'Hybrid inverter', warrantyYears: 10, blurb: 'Converts and manages the power your panels generate.' },
  battery:  { kind: 'battery', maker: '', spec: 'LFP battery storage', warrantyYears: 10, blurb: 'Stores excess solar for when you actually use power.' },
  diverter: { kind: 'diverter', maker: '', spec: 'Hot-water diverter', warrantyYears: 3, blurb: 'Sends excess solar to the immersion for free hot water.' },
  charger:  { kind: 'charger', maker: '', spec: 'EV charger', warrantyYears: 3, blurb: 'Charges the car off the roof.' },
};

export function getProductsByKind(kind: CatalogProduct['kind']): CatalogProduct[] {
  return CATALOG.filter(p => p.kind === kind);
}

export function getProduct(model: string | null | undefined, kind: CatalogProduct['kind']): CatalogProduct | null {
  if (!model) return null;
  const hit = CATALOG.find(p => p.model.toLowerCase() === model.toLowerCase())
    ?? CATALOG.find(p => p.kind === kind && model.toLowerCase().includes(p.maker.toLowerCase()));
  // Unknown models still get the kind illustration — never an empty grey box.
  return hit ?? { model, ...KIND_DEFAULT[kind], image: KIND_IMAGE[kind] };
}

// ── Image bridge (owner uploads → customer proposal) ────────────────────────
// The owner uploads real photos on the Products page (localStorage, keyed by
// that page's product ids). Proposals render from THIS catalog, so uploads
// are ALSO written under a normalised maker+model key which we resolve here.
// Sweep 8 replaces both maps with the product table + storage.
export const normModel = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export function resolveProductImage(p: CatalogProduct): string {
  try {
    const byModel = JSON.parse(localStorage.getItem('aisolar_product_images_by_model') || '{}') as Record<string, string>;
    const want = normModel(`${p.maker} ${p.model}`);
    const alt = normModel(p.model);
    for (const [k, v] of Object.entries(byModel)) {
      if (k === want || k === alt) return v;
      if (k.length >= 8 && (want.includes(k) || k.includes(want))) return v;
    }
  } catch { /* ignore */ }
  return p.image ?? '/placeholder.svg';
}
