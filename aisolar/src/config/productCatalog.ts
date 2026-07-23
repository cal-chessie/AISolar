/**
 * Product catalogue — the gear that appears on customer proposals.
 *
 * Cal: "allow to add product images." Drop a real photo URL (or /products/x.png
 * in /public) into `image` and it appears on every proposal that quotes that
 * model. Until then a branded placeholder renders — never a broken image.
 */
export interface CatalogProduct {
  model: string;
  kind: 'panel' | 'inverter' | 'battery';
  maker: string;
  /** headline spec the homeowner understands */
  spec: string;
  warrantyYears: number;
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
    blurb: 'Tier-1 panels with 25-year performance warranty — still ≥84.5% output in year 25.',
  },
  {
    model: 'TrinaSolar TSM-440 NEG9RC.28', kind: 'panel', maker: 'TrinaSolar',
    spec: '440 W · Vertex S+ · dual-glass', warrantyYears: 25,
    datasheet: '/datasheets/trinasolar-tsm-440-neg9rc28.pdf',
    blurb: 'Vertex S+ dual-glass — the datasheet the BER assessor needs ships with your proposal.',
  },
  {
    model: 'SolaX X1-HYBRID-5.0T', kind: 'inverter', maker: 'SolaX',
    spec: '5 kW hybrid · battery-ready', warrantyYears: 10,
    blurb: 'Hybrid inverter proven on Irish domestic installs — panels, battery and export in one unit.',
  },
  {
    model: 'Longi 430W', kind: 'panel', maker: 'LONGi',
    spec: '430 W · all-black mono', warrantyYears: 25,
    blurb: 'Tier-1 manufacturer, proven Irish-climate performance in low light.',
  },
  {
    model: 'Sigenergy SigenStor 8kW', kind: 'inverter', maker: 'Sigenergy',
    spec: '8 kW hybrid · battery-ready', warrantyYears: 10,
    blurb: 'Hybrid inverter that manages panels, battery and grid export in one unit.',
  },
  {
    model: 'SolarEdge Home Hub', kind: 'inverter', maker: 'SolarEdge',
    spec: 'hybrid · per-panel optimisation', warrantyYears: 12,
    blurb: 'Per-panel optimisation — shading on one panel no longer drags down the rest.',
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
];

const KIND_DEFAULT: Record<CatalogProduct['kind'], Omit<CatalogProduct, 'model'>> = {
  panel:    { kind: 'panel', maker: '', spec: 'Tier-1 mono panel', warrantyYears: 25, blurb: 'Tier-1 solar panel with 25-year performance warranty.' },
  inverter: { kind: 'inverter', maker: '', spec: 'Hybrid inverter', warrantyYears: 10, blurb: 'Converts and manages the power your panels generate.' },
  battery:  { kind: 'battery', maker: '', spec: 'LFP battery storage', warrantyYears: 10, blurb: 'Stores excess solar for when you actually use power.' },
};

export function getProductsByKind(kind: CatalogProduct['kind']): CatalogProduct[] {
  return CATALOG.filter(p => p.kind === kind);
}

export function getProduct(model: string | null | undefined, kind: CatalogProduct['kind']): CatalogProduct | null {
  if (!model) return null;
  const hit = CATALOG.find(p => p.model.toLowerCase() === model.toLowerCase())
    ?? CATALOG.find(p => p.kind === kind && model.toLowerCase().includes(p.maker.toLowerCase()));
  return hit ?? { model, ...KIND_DEFAULT[kind] };
}
