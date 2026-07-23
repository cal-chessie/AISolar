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
    <div className="mt-2 p-2.5 rounded-[8px] border border-dashed border-border">
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
