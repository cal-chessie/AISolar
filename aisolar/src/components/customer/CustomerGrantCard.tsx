/**
 * CustomerGrantCard — the customer's own live view of their SEAI grant. Mirrors
 * the owner tracker but in warm, customer-facing language: where the grant is,
 * and the ONE thing they need to do now.
 *
 * The grant is NET and paid to THEM — SEAI pays the homeowner directly once the
 * claim + BER are in, to the bank details they enter on the SEAI portal. Read-
 * only for the customer (RLS: token access sees status, staff advance stages);
 * customer-driven steps are guidance, confirmed back through their installer.
 */
import { Award, ExternalLink, AlertTriangle, CheckCircle2, FileText, Clock } from 'lucide-react';
import type { DummyLead } from '@/lib/dummyData';
import { useGrant, grantProgress, offerClock, type SeaiGrantStatus } from '@/lib/seaiGrant';
import { getCompanyCompliance } from '@/lib/companyCompliance';
import { getTenantBrand } from '@/lib/tenantBrand';
import { eur, calculateSEAI, seaiPropertyType } from '@/lib/seaiPipeline';

/** What the CUSTOMER sees as their status + next move, per lifecycle stage. */
function customerView(status: SeaiGrantStatus): { headline: string; sub: string; theirMove: boolean } {
  switch (status) {
    case 'not_started':
      return { headline: 'Claim your SEAI grant', sub: 'One quick application — do this before we install.', theirMove: true };
    case 'offer_applied':
      return { headline: 'Application in — watch for your offer', sub: 'SEAI will email your grant offer. We won’t install until it arrives.', theirMove: false };
    case 'offer_received':
      return { headline: 'Grant offer received', sub: 'We’ll schedule your installation now.', theirMove: false };
    case 'installed':
      return { headline: 'Installed — documents on the way', sub: 'We’re preparing the paperwork your BER assessor needs.', theirMove: false };
    case 'docs_shared':
      return { headline: 'Book your post-works BER', sub: 'Forward the documents below to a registered BER assessor.', theirMove: true };
    case 'ber_booked':
      return { headline: 'BER booked', sub: 'Once it’s published we submit your grant claim.', theirMove: false };
    case 'ber_published':
      return { headline: 'BER published — submitting your claim', sub: 'We’re sending everything to SEAI for you.', theirMove: false };
    case 'dow_submitted':
      return { headline: 'Claim with SEAI', sub: 'SEAI will pay your grant into your bank. Nothing more to do.', theirMove: false };
    case 'paid':
      return { headline: 'Grant paid 🎉', sub: 'SEAI has paid your grant to your bank.', theirMove: false };
    case 'offer_expired':
      return { headline: 'Grant offer expired', sub: 'The 8-month window closed — we’ll help you re-apply.', theirMove: true };
    case 'ineligible':
      return { headline: 'Grant may not apply', sub: 'This home may not meet the SEAI grant conditions — we’ll confirm with you.', theirMove: false };
  }
}

export default function CustomerGrantCard({ lead }: { lead: DummyLead }) {
  const rec = useGrant(lead.id);
  const propertyType = seaiPropertyType((lead.intake as Record<string, unknown>)?.property_type as string);
  if (propertyType !== 'domestic') return null; // commercial NDMG is a different journey

  const progress = grantProgress(rec);
  const clock = offerClock(rec);
  const view = customerView(rec.status);
  const cc = getCompanyCompliance();
  const company = getTenantBrand().name || 'your installer';
  const grantAmount = rec.grantAmount ?? lead.proposal?.seai_grant ?? calculateSEAI({
    systemSizeKw: lead.proposal?.system_size_kw ?? 0, propertyType,
    installType: 'retrofit', annualKwhUsage: lead.annual_kwh ?? 0,
    annualProductionKwh: 0, selfConsumptionPct: 0.7, netCost: lead.proposal?.net_cost ?? 0,
  }).solarElectricityGrant;

  const inOfferPhase = rec.status === 'not_started' || rec.status === 'offer_applied';
  const showBerDocs = rec.status === 'docs_shared' || rec.status === 'ber_booked';

  return (
    <div className="rounded-panel border border-tech/30 bg-tech/[0.04] p-4 max-w-2xl">
      <div className="flex items-start gap-2">
        <Award className="size-5 text-tech shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{view.headline}</h3>
            <span className="text-2xs font-semibold text-tech tabular-nums">{eur(grantAmount)}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{view.sub}</p>
        </div>
        <span className="text-2xs text-muted-foreground shrink-0 tabular-nums">{progress}%</span>
      </div>

      {/* progress rail */}
      <div className="mt-2.5 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-tech transition-all duration-500" style={{ width: `${Math.max(6, progress)}%` }} />
      </div>

      {/* offer clock */}
      {clock.expiresAt && !clock.expired && (clock.daysLeft ?? 99) < 60 && (
        <p className="mt-2 text-2xs text-doc-proposal flex items-center gap-1"><Clock className="size-3" /> {clock.daysLeft} days left on your grant offer.</p>
      )}

      {/* THE APPLY STEP — the customer's guided application */}
      {inOfferPhase && (
        <div className="mt-3 rounded-control border border-border bg-card p-3 text-xs space-y-2">
          <p className="font-semibold">How to apply (5 minutes)</p>
          <ol className="space-y-1.5 text-muted-foreground list-decimal pl-4">
            <li>Go to the SEAI grant portal and start a Solar PV grant application.</li>
            <li>Choose <span className="font-semibold text-foreground">{company}</span> as your registered installer{cc.seaiInstallerId ? <> (SEAI reg <span className="font-mono text-foreground">{cc.seaiInstallerId}</span>)</> : null}.</li>
            <li>Have your <span className="font-semibold text-foreground">MPRN</span>{lead.mprn ? <> (<span className="font-mono text-foreground">{lead.mprn}</span>)</> : null} and your <span className="font-semibold text-foreground">bank details</span> ready — SEAI pays the {eur(grantAmount)} grant straight to you.</li>
          </ol>
          <a href="https://www.seai.ie/grants/home-energy-grants/individual-grants/solar-electricity-grant" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-tech font-semibold hover:underline">
            Open the SEAI grant page <ExternalLink className="size-3" />
          </a>
          <div className="mt-1 rounded-control border border-doc-proposal/40 bg-doc-proposal/5 p-2 flex items-start gap-1.5">
            <AlertTriangle className="size-3.5 text-doc-proposal shrink-0 mt-0.5" />
            <span className="text-2xs text-muted-foreground"><span className="font-semibold text-doc-proposal">Wait for your grant offer before we install.</span> Starting the work before the offer arrives voids the grant.</span>
          </div>
        </div>
      )}

      {/* THE BER DOCS — shared in pre-handover for the customer's BER assessor */}
      {showBerDocs && (
        <div className="mt-3 rounded-control border border-border bg-card p-3 text-xs">
          <p className="font-semibold flex items-center gap-1.5"><FileText className="size-3.5 text-tech" /> For your BER assessor</p>
          <p className="mt-0.5 text-muted-foreground leading-snug">Forward these to the registered BER assessor you book — they need them for your post-works BER.</p>
          {rec.docsSharedAt
            ? <p className="mt-1.5 text-2xs text-doc-deposit flex items-center gap-1"><CheckCircle2 className="size-3" /> Declaration of Works + data sheets ready in your Documents.</p>
            : <p className="mt-1.5 text-2xs text-muted-foreground">Your installer is preparing them now.</p>}
        </div>
      )}

      {rec.status === 'paid' && (
        <p className="mt-3 text-xs font-medium text-doc-deposit flex items-center gap-1.5"><CheckCircle2 className="size-4" /> {eur(grantAmount)} paid to your bank by SEAI.</p>
      )}
    </div>
  );
}
