/**
 * BlockDiagram — the per-job Single Line Diagram, GENERATED.
 *
 * Cal: "obv the block diagram will be different for every job but if you
 * could work it out… i think we have just unlocked the whole solar industry
 * in one platform." The insight: an SLD is a fixed chain of symbols whose
 * LABELS are the job's data — and we hold all of it. Array (panels × model)
 * from the design step, inverter model/kW from the gear pick, battery if
 * quoted, phase from the survey, MPRN and address from the bill read,
 * company from the tenant brand. Engineer reviews and stamps; the drawing
 * draws itself.
 *
 * Modelled on a real contractor SLD (title block, array → MCB → inverter →
 * CT/export → board MCB → cutout → ESB supply). Print-friendly: black
 * lines on white, standard-ish symbols.
 */
import type { DummyLead } from '@/lib/dummyData';
import { getTenantBrand } from '@/lib/tenantBrand';
import { brand } from '@/config/brand';

export default function BlockDiagram({ lead }: { lead: DummyLead }) {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const p = lead.proposal;
  const threePhase = /three/i.test(lead.survey?.confirmed_inverter_type ?? '');
  const kW = p?.system_size_kw ?? 0;
  const company = getTenantBrand().proposalCompanyName || brand.legal.tradingName;
  const mprn = (i.extracted_mprn as string) ?? lead.mprn ?? '⟨MPRN⟩';
  const addr = ((i.extracted_address as string) ?? lead.address ?? '').split(',').map(s => s.trim());
  const eircode = (i.extracted_eircode as string) ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0] ?? '';
  const arrayLabel = p ? `${p.panel_model.toUpperCase()} × ${p.panel_count}` : '⟨ARRAY — design step⟩';
  const invLabel = p ? `1 × ${p.inverter_model.toUpperCase()}` : '⟨INVERTER⟩';
  // MCB sizing rule-of-thumb from inverter AC amps (kW/230V or /400V√3), next standard size up
  const acAmps = kW ? (threePhase ? (kW * 1000) / (400 * 1.732) : (kW * 1000) / 230) : 0;
  const mcb = [16, 20, 25, 32, 40, 63].find(r => r >= acAmps * 1.25) ?? 63;
  const supply = threePhase ? '3~ 50 Hz' : '1~ 50 Hz';

  const B = { stroke: 'black', strokeWidth: 1.2, fill: 'none' } as const;
  const T = { fontFamily: 'Arial, sans-serif', fill: 'black' } as const;

  return (
    <svg viewBox="0 0 760 460" className="w-full h-auto bg-white rounded-[8px] border border-border" aria-label="Single line diagram">
      {/* frame */}
      <rect x="8" y="8" width="744" height="404" {...B} />
      {/* address block */}
      <text x="20" y="30" fontSize="11" fontWeight="bold" {...T}>
        {addr.slice(0, 3).map((l, k) => <tspan key={k} x="20" dy={k === 0 ? 0 : 13}>{l.toUpperCase()}</tspan>)}
        {eircode && <tspan x="20" dy="13">{eircode}</tspan>}
      </text>

      {/* PV array symbol: grid of cells */}
      <g>
        <text x="60" y="120" fontSize="10" fontWeight="bold" {...T}>{arrayLabel}</text>
        <text x="60" y="133" fontSize="9" fill="#c00" fontFamily="Arial">PV ARRAY</text>
        {[0, 1, 2].map(r => [0, 1, 2, 3].map(c => (
          <rect key={`${r}${c}`} x={140 + c * 16} y={140 + r * 14} width="15" height="13" {...B} />
        )))}
        {/* DC line down to isolator + inverter */}
        <line x1="170" y1="182" x2="170" y2="205" {...B} />
        <circle cx="170" cy="212" r="6" {...B} /><line x1="166" y1="208" x2="174" y2="216" {...B} />
        <text x="182" y="216" fontSize="8" {...T}>DC ISOLATOR</text>
        <line x1="170" y1="218" x2="170" y2="240" {...B} />
        <rect x="130" y="240" width="80" height="34" {...B} />
        <text x="170" y="255" fontSize="8" textAnchor="middle" {...T}>INVERTER</text>
        <text x="170" y="266" fontSize="7.5" textAnchor="middle" {...T}>{invLabel}</text>
      </g>

      {/* battery, if quoted — DC-coupled off the hybrid */}
      {p?.battery_model && (
        <g>
          <line x1="130" y1="257" x2="90" y2="257" {...B} />
          <rect x="30" y="242" width="60" height="30" {...B} />
          <text x="60" y="255" fontSize="7.5" textAnchor="middle" {...T}>BATTERY</text>
          <text x="60" y="265" fontSize="7" textAnchor="middle" {...T}>{p.battery_model.split(' ').slice(0, 2).join(' ').toUpperCase()}</text>
        </g>
      )}

      {/* AC run: inverter → AC isolator → gen meter → MCB at board */}
      <line x1="210" y1="257" x2="300" y2="257" {...B} />
      <circle cx="308" cy="257" r="6" {...B} /><line x1="304" y1="253" x2="312" y2="261" {...B} />
      <text x="298" y="245" fontSize="8" {...T}>AC ISOLATOR</text>
      <line x1="314" y1="257" x2="360" y2="257" {...B} />
      <circle cx="372" cy="257" r="12" {...B} />
      <text x="372" y="260" fontSize="7" textAnchor="middle" {...T}>kWh</text>
      <text x="360" y="280" fontSize="8" {...T}>GEN METER</text>
      <line x1="384" y1="257" x2="410" y2="257" {...B} />
      <rect x="410" y="243" width="44" height="28" {...B} />
      <text x="432" y="254" fontSize="6.5" textAnchor="middle" {...T}>INTERFACE</text>
      <text x="432" y="263" fontSize="6.5" textAnchor="middle" {...T}>PROTECTION</text>
      <line x1="454" y1="257" x2="470" y2="257" {...B} />
      {/* export CT on the main */}
      <circle cx="470" cy="257" r="5" fill="black" />
      <text x="462" y="245" fontSize="8" {...T}>CT</text>
      <line x1="470" y1="257" x2="560" y2="257" {...B} />
      <line x1="560" y1="257" x2="560" y2="150" {...B} />

      {/* MCB into existing board */}
      <line x1="552" y1="166" x2="568" y2="150" {...B} /><line x1="552" y1="150" x2="568" y2="166" {...B} />
      <text x="576" y="162" fontSize="8" fill="#c00" fontFamily="Arial">{mcb}A {threePhase ? 'TP' : 'SP'} MCB</text>
      <rect x="510" y="100" width="130" height="40" stroke="#c0f" strokeWidth="1.2" fill="none" />
      <text x="575" y="117" fontSize="8" textAnchor="middle" {...T}>EXISTING</text>
      <text x="575" y="128" fontSize="8" textAnchor="middle" {...T}>CONSUMER UNIT</text>
      <line x1="575" y1="140" x2="575" y2="150" {...B} />

      {/* main run down: cutout → ESB meter → supply */}
      <line x1="575" y1="140" x2="660" y2="140" {...B} />
      <line x1="660" y1="140" x2="660" y2="200" {...B} />
      <rect x="640" y="200" width="40" height="46" {...B} />
      <text x="660" y="220" fontSize="7.5" textAnchor="middle" {...T}>{threePhase ? '100A' : '80A'}</text>
      <text x="660" y="231" fontSize="7.5" textAnchor="middle" {...T}>CUTOUT</text>
      <line x1="660" y1="246" x2="660" y2="290" {...B} />
      <ellipse cx="660" cy="302" rx="16" ry="11" {...B} />
      <text x="660" y="306" fontSize="7" textAnchor="middle" {...T}>ESB</text>
      <line x1="660" y1="313" x2="660" y2="350" {...B} />
      <text x="660" y="366" fontSize="9" textAnchor="middle" fontWeight="bold" {...T}>ESB UTILITY SUPPLY</text>
      <text x="660" y="379" fontSize="8" textAnchor="middle" {...T}>{supply}</text>

      {/* title block */}
      <rect x="8" y="412" width="744" height="40" {...B} />
      <line x1="200" y1="412" x2="200" y2="452" {...B} />
      <line x1="400" y1="412" x2="400" y2="452" {...B} />
      <line x1="580" y1="412" x2="580" y2="452" {...B} />
      <text x="104" y="436" fontSize="10" textAnchor="middle" fontWeight="bold" {...T}>{company}</text>
      <text x="300" y="436" fontSize="9" textAnchor="middle" {...T}>Single Line Diagram</text>
      <text x="490" y="429" fontSize="8" textAnchor="middle" {...T}>MPRN: {mprn}</text>
      <text x="490" y="442" fontSize="8" textAnchor="middle" {...T}>{kW ? `${kW} kWp` : ''} {p ? `· Rev 1` : ''}</text>
      <text x="666" y="436" fontSize="8" textAnchor="middle" {...T}>Sheet 1 of 1</text>
    </svg>
  );
}
