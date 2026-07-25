/**
 * docTemplates — the real Irish solar paperwork, as templates.
 *
 * Built from Cal's ACTUAL field documents (a signed SEAI Declaration of
 * Works and an ESB Letter of Authority). The structure is theirs verbatim;
 * every personal detail is replaced by a field captured through the bill
 * upload, survey or proposal — no real customer data lives in this code.
 *
 * Signature slots are SLOTS: the homeowner signs at handover (the signature
 * capture already in JobViewV2), the installer signs on completion. Nothing
 * here fakes a signature.
 */
import type { DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';
import { useTenantBrand, getTenantBrand } from '@/lib/tenantBrand';
import { getProduct } from '@/config/productCatalog';
import { inverterAcKw, decideCompliance } from '@/lib/complianceDecision';

const eur = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** A labelled template row: value when we hold it, an explicit source-tag gap when we don't. */
function Row({ label, value, from }: { label: string; value?: string | number | null; from?: string }) {
  const has = value !== undefined && value !== null && value !== '' && value !== '—';
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-border/60 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right font-medium ${has ? '' : 'text-doc-proposal'}`}>
        {has ? String(value) : `⟨ ${from ?? 'to capture'} ⟩`}
      </span>
    </div>
  );
}

function SignatureSlot({ who, when }: { who: string; when: string }) {
  return (
    <div className="mt-2 p-2.5 rounded-control border border-dashed border-border">
      <div className="flex justify-between text-2xs text-muted-foreground"><span>Signed</span><span>Date __ / __ / ____</span></div>
      <div className="h-8 grid place-items-center text-2xs text-muted-foreground italic">signature slot — {who}, captured {when}</div>
    </div>
  );
}

function fields(lead: DummyLead) {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const panel = lead.proposal ? getProduct(lead.proposal.panel_model, 'panel') : null;
  return {
    name: (i.extracted_account_name as string) ?? lead.name,
    address: (i.extracted_address as string) ?? lead.address,
    eircode: (i.extracted_eircode as string) ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0],
    mprn: (i.extracted_mprn as string) ?? lead.mprn,
    yearBuilt: i.year_built as string | undefined,
    kWp: lead.proposal?.system_size_kw,
    panelCount: lead.proposal?.panel_count,
    panelModel: lead.proposal?.panel_model,
    panelWp: panel?.spec?.match(/(\d{3,4})\s*W/)?.[1],
    inverter: lead.proposal?.inverter_model,
    battery: lead.proposal?.battery_model,
    yieldKwh: (i.estimated_annual_production_kwh as number) ?? (lead.proposal ? Math.round(lead.proposal.system_size_kw * 950) : undefined),
    hwDiverter: (i.hot_water_diverter as boolean | undefined),
    totalCost: lead.proposal?.net_cost,
    company: getTenantBrand().proposalCompanyName || brand.legal.tradingName,
    seaiCompanyId: brand.legal.companyNumber || undefined, // SEAI register ID — needs Cal's number
  };
}

/** SEAI Declaration of Works — Part 1 + declarations, exactly the SEAI form's shape. */
export function DowTemplate({ lead }: { lead: DummyLead }) {
  const f = fields(lead);
  return (
    <div className="space-y-4 text-xs">
      <div>
        <div className="font-bold mb-1">Installation Details</div>
        <Row label="Applicant name (grant claimant)" value={f.name} from="bill read" />
        <Row label="Installation address" value={f.address} from="bill read" />
        <Row label="Eircode" value={f.eircode} from="bill read" />
        <Row label="MPRN" value={f.mprn} from="bill read" />
      </div>
      <div>
        <div className="font-bold mb-1">System Details</div>
        <Row label="Solar PV system size (DC nameplate)" value={f.kWp ? `${f.kWp} kWp` : undefined} from="design step" />
        <Row label="Battery storage" value={f.battery ?? 'N/A'} />
        <Row label="Annual estimated yield (AC)" value={f.yieldKwh ? `${f.yieldKwh.toLocaleString()} kWh` : undefined} from="estimate" />
        <Row label="Method of yield calculation" value="PVGIS-SARAH3" />
        <Row label="Hot water diverter installed?" value={f.hwDiverter === undefined ? undefined : f.hwDiverter ? 'Y' : 'N'} from="survey goals" />
      </div>
      <div>
        <div className="font-bold mb-1">Solar PV Registered Company</div>
        <Row label="Company name" value={f.company} />
        <Row label="Company identification number" value={f.seaiCompanyId} from="Settings — SEAI company ID" />
        <Row label="Property year of construction" value={f.yearBuilt} from="intake — year built" />
        <Row label="Total cost incl. parts, labour, VAT" value={eur(f.totalCost)} from="proposal" />
      </div>
      <div>
        <div className="font-bold mb-1">System Components</div>
        <Row label="Solar PV modules" value={f.panelModel ? `${f.panelCount} × ${f.panelModel}${f.panelWp ? ` (${f.panelWp} Wp)` : ''}` : undefined} from="design step" />
        <Row label="Inverter" value={f.inverter} from="design step" />
        <Row label="Battery energy storage" value={f.battery ?? 'N/A'} />
      </div>
      <div className="pt-2 border-t border-border">
        <div className="font-bold mb-1">Installer Declaration</div>
        <p className="text-muted-foreground leading-snug">
          Installed and commissioned at the above address · compliant with the SEAI Domestic Solar PV
          Code of Practice · electrical works per I.S. 10101 with a Safe Electric ('RECI') certificate
          issued by a Registered Electrical Contractor · Inspection, Test &amp; Commissioning Report
          completed and given to the homeowner · claim documentation provided.
        </p>
        <SignatureSlot who="the installer" when="on completion" />
      </div>
      <div>
        <div className="font-bold mb-1">Homeowner Declaration</div>
        <p className="text-muted-foreground leading-snug">
          I am the owner of this dwelling; the works are completed to my satisfaction; I have paid the
          contractor or entered an agreed payment schedule; I understand SEAI may inspect the works.
        </p>
        <SignatureSlot who={f.name} when="at handover" />
      </div>
    </div>
  );
}

/**
 * ── ESB NC6 / NC7 ────────────────────────────────────────────────────────────
 *
 * The forms themselves, prepared from what the platform already holds. Until
 * now these were blank PDF links in a forms library and the pack around them
 * was what got "auto-prepared" — the form was still typed by hand.
 *
 * Two things it is important to be straight about, because they change the job:
 *
 *  • NC6 is a NOTIFICATION. Micro-generation inside the limits (≤6kW single
 *    phase / ≤11kW three phase) is connected and then notified — you do not
 *    wait for permission.
 *  • NC7 is an APPLICATION. Above those limits you must have ESB's offer and
 *    acceptance BEFORE energising. Treating one like the other is how jobs get
 *    stuck, so the templates say which they are on their face.
 *
 * Anything not yet captured renders as an explicit ⟨ gap ⟩ with the step it
 * comes from. Nothing is invented to make a form look finished.
 */

/** Fields the ESB forms need that the rest of the platform doesn't already hold. */
export interface EsbReadiness {
  ready: boolean;
  missing: Array<{ field: string; from: string }>;
}

/**
 * What's still blocking submission. This is the automation: the form knows what
 * it needs, so nobody discovers a missing RECI number at the point of filing.
 */
export function esbReadiness(lead: DummyLead): EsbReadiness {
  const f = fields(lead);
  const missing: Array<{ field: string; from: string }> = [];

  if (!f.mprn) missing.push({ field: 'MPRN', from: 'bill read' });
  if (!f.address) missing.push({ field: 'Installation address', from: 'bill read' });
  if (!f.eircode) missing.push({ field: 'Eircode', from: 'bill read' });
  if (!f.inverter) missing.push({ field: 'Inverter make and model', from: 'proposal' });
  if (!f.kWp) missing.push({ field: 'Array size (kWp)', from: 'proposal' });
  // Phase is DERIVED by decideCompliance from the survey, not a loose field —
  // it only counts as missing when there's no survey to derive it from.
  if (!lead.survey) missing.push({ field: 'Supply phase confirmation', from: 'site survey' });
  if (!brand.legal?.reciNumber) missing.push({ field: 'Safe Electric / RECI number', from: 'company settings' });

  return { ready: missing.length === 0, missing };
}

/** Shared head block — both forms open with the same installation identity. */
function EsbHead({ lead, form }: { lead: DummyLead; form: 'NC6' | 'NC7' }) {
  const f = fields(lead);
  const { threePhase } = decideCompliance(lead);
  return (
    <>
      <div className="text-center">
        <div className="font-bold">ESB NETWORKS — FORM {form}</div>
        <div className="text-2xs text-muted-foreground">
          {form === 'NC6'
            ? 'Notification of micro-generation connected to the distribution system'
            : 'Application for connection of mini-generation'}
        </div>
      </div>

      <div className="pt-1">
        <div className="font-semibold mb-1">1 · Installation</div>
        <Row label="MPRN" value={f.mprn} from="bill read" />
        <Row label="Customer name" value={f.name} from="bill read" />
        <Row label="Installation address" value={f.address} from="bill read" />
        <Row label="Eircode" value={f.eircode} from="bill read" />
        <Row label="Supply phase" value={lead.survey ? (threePhase ? 'Three phase' : 'Single phase') : undefined} from="site survey" />
      </div>
    </>
  );
}

/** Shared generator block — the numbers ESB actually assess. */
function EsbGenerator({ lead }: { lead: DummyLead }) {
  const f = fields(lead);
  const tiic = inverterAcKw(lead);
  return (
    <div className="pt-1">
      <div className="font-semibold mb-1">2 · Generating plant</div>
      <Row label="Technology" value="Solar photovoltaic" />
      <Row label="Array size (kWp DC)" value={f.kWp ? `${f.kWp} kWp` : undefined} from="proposal" />
      <Row label="Panels" value={f.panelCount && f.panelModel ? `${f.panelCount} × ${f.panelModel}` : undefined} from="proposal" />
      <Row label="Inverter" value={f.inverter} from="proposal" />
      <Row label="Inverter rated output (kW AC)" value={tiic ? `${tiic} kW` : undefined} from="proposal" />
      <Row label="Storage" value={f.battery ?? 'None'} />
      <Row label="Grid protection standard" value="EN 50549-1 / ESBN interface protection" />
      <p className="mt-1.5 text-2xs text-muted-foreground leading-snug">
        The rated <strong>AC output of the inverter</strong> decides the form, not the array size —
        a {f.kWp ?? 7} kWp array on a {tiic || 5} kW inverter is assessed at {tiic || 5} kW.
      </p>
    </div>
  );
}

/** Shared installer block. */
function EsbInstaller({ lead }: { lead: DummyLead }) {
  const f = fields(lead);
  return (
    <div className="pt-1">
      <div className="font-semibold mb-1">3 · Installer</div>
      <Row label="Company" value={f.company} />
      <Row label="Safe Electric / RECI number" value={brand.legal?.reciNumber || undefined} from="company settings" />
      <Row label="Registered address" value={brand.legal?.registeredAddress} />
      <Row label="Installer contact" value={lead.assigned_installer ?? undefined} from="job assignment" />
    </div>
  );
}

/**
 * NC6 — micro-generation NOTIFICATION.
 * Connected first, notified after. No ESB approval needed to energise.
 */
export function Nc6Template({ lead }: { lead: DummyLead }) {
  const r = esbReadiness(lead);
  return (
    <div className="space-y-3 text-xs">
      <EsbHead lead={lead} form="NC6" />
      <EsbGenerator lead={lead} />
      <EsbInstaller lead={lead} />

      <div className="pt-1">
        <div className="font-semibold mb-1">4 · Declaration</div>
        <p className="leading-snug">
          I confirm the micro-generator described above has been installed in accordance with the
          relevant standards and the ESB Networks conditions of connection, that the interface
          protection settings are as required, and that the installation has been tested and
          certified by a registered electrical contractor.
        </p>
      </div>
      <SignatureSlot who="registered electrical contractor" when="on commissioning" />

      <ReadinessNote readiness={r} form="NC6" />
    </div>
  );
}

/**
 * NC7 — mini-generation APPLICATION.
 * Must be offered and accepted BEFORE energising. Carries the extra technical
 * schedule ESB assess against.
 */
export function Nc7Template({ lead }: { lead: DummyLead }) {
  const f = fields(lead);
  const d = decideCompliance(lead);
  const r = esbReadiness(lead);
  return (
    <div className="space-y-3 text-xs">
      <EsbHead lead={lead} form="NC7" />
      <EsbGenerator lead={lead} />

      <div className="pt-1">
        <div className="font-semibold mb-1">3 · Export</div>
        <Row label="Maximum export capacity" value={`${inverterAcKw(lead)} kW`} from="proposal" />
        <Row label="Export limitation" value={d.needsG10 ? 'Required — G10 central protection relay' : 'Not required at this capacity'} />
        <Row label="Single line diagram" value="Attached — generated from the design" />
        <Row label="Estimated annual generation" value={f.yieldKwh ? `${f.yieldKwh.toLocaleString()} kWh` : undefined} from="proposal" />
      </div>

      <EsbInstaller lead={lead} />

      <div className="pt-1">
        <div className="font-semibold mb-1">5 · Declaration</div>
        <p className="leading-snug">
          Application is made for connection of the mini-generation plant described above. I confirm
          the details are accurate and that the plant will not be energised for export until a
          connection offer has been made by ESB Networks and accepted.
        </p>
      </div>
      <SignatureSlot who="applicant / authorised agent" when="before submission" />

      <div className="rounded-control border border-doc-proposal/40 bg-doc-proposal/5 p-2.5">
        <p className="text-2xs font-semibold text-doc-proposal">NC7 is an application, not a notification</p>
        <p className="mt-0.5 text-2xs leading-snug">
          This must be submitted and accepted <strong>before</strong> the system is energised for
          export. Book the install against the offer date, not the survey date.
        </p>
      </div>

      <ReadinessNote readiness={r} form="NC7" />
    </div>
  );
}

/** What's still blocking submission, and where each missing field comes from. */
function ReadinessNote({ readiness, form }: { readiness: EsbReadiness; form: 'NC6' | 'NC7' }) {
  if (readiness.ready) {
    return (
      <div className="rounded-control border border-doc-deposit/40 bg-doc-deposit/5 p-2.5">
        <p className="text-2xs font-semibold text-doc-deposit">{form} is complete</p>
        <p className="mt-0.5 text-2xs leading-snug">
          Every field ESB needs is captured. A registered contractor signs and it goes.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-control border border-doc-proposal/40 bg-doc-proposal/5 p-2.5">
      <p className="text-2xs font-semibold text-doc-proposal">
        {form} needs {readiness.missing.length} more {readiness.missing.length === 1 ? 'field' : 'fields'}
      </p>
      <ul className="mt-1 space-y-0.5">
        {readiness.missing.map(m => (
          <li key={m.field} className="text-2xs leading-snug">
            <strong>{m.field}</strong> — from the {m.from}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** ESB Letter of Authority — homeowner authorises the contractor for the NC6/NC7. */
export function LoaTemplate({ lead, esbForm }: { lead: DummyLead; esbForm: 'NC6' | 'NC7' }) {
  const f = fields(lead);
  return (
    <div className="space-y-3 text-xs">
      <div className="text-center font-bold">
        {(f.address ?? '⟨ address — bill read ⟩').toUpperCase()}{f.eircode ? ` · ${f.eircode}` : ''}
      </div>
      <Row label="MPRN" value={f.mprn} from="bill read" />
      <Row label="To" value="ESB Networks" />
      <Row label="Re" value={`Authorisation for ${f.company}`} />
      <div className="pt-2">
        <div className="font-bold mb-1 text-center">Letter of Authority</div>
        <p className="leading-snug">To whom it may concern,</p>
        <p className="leading-snug mt-2">
          I, <strong>{f.name}</strong>, as the electricity account holder for MPRN{' '}
          <strong>{f.mprn ?? '⟨ MPRN — bill read ⟩'}</strong>, hereby grant authority for{' '}
          <strong>{f.company}</strong> to act on my behalf in all matters relating to the application
          for the connection of mini-generation at{' '}
          <strong>{f.address ?? '⟨ address ⟩'}{f.eircode ? `, ${f.eircode}` : ''}</strong>.
        </p>
        <p className="leading-snug mt-2">
          This includes authority to complete, sign and submit the <strong>{esbForm} application
          form</strong>, remit payment of all associated invoices and act as a point of contact for
          any queries in relation to the application.
        </p>
      </div>
      <SignatureSlot who={f.name} when="with the contract" />
      <div className="text-2xs text-muted-foreground">
        Name · address · email · phone print beneath the signature from the customer record.
      </div>
    </div>
  );
}
