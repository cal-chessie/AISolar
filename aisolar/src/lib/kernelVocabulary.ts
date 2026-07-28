/**
 * kernelVocabulary — Domain 001's grammar, named to slot straight into the kernel.
 *
 * This file is the NAMING CONTRACT between AISolar (the domain) and the AIOS
 * kernel (the constitutional substrate). It wires NOTHING — Sweep 8 builds the
 * emit path (server-side edge fn, service_role only) and Gate B governs any
 * kernel-side change. What this file guarantees TODAY is that every event this
 * app will ever emit already carries the EXACT name registered in
 * `kernel.event_types`, so migration is a mapping exercise, not a rename.
 *
 * THE EMIT LAW (kernel doctrine — every rule enforced kernel-side, honoured here):
 *   1. Tenant is EXPLICIT on every emit. No default. Forgetting = crash, never misfile.
 *   2. Payloads carry REFERENCES only — ids, hashes, counts. NEVER names, emails,
 *      phones, addresses, free-text notes. The kernel is append-only; PII in it
 *      is a GDPR wound that cannot heal. PII lives in app tables (erasable).
 *   3. Event types are pre-registered. Anything not in this vocabulary is
 *      rejected at the door — that is the admission gate working.
 *   4. Payload cap 64 KiB. Images/signatures NEVER ride in payloads — storage
 *      holds the artifact, the kernel holds the hash.
 *   5. Commands draft; humans approve; only outcomes become events.
 */

/** Kernel event types this domain emits — names EXACTLY as registered in
 *  kernel.event_types (verified against the live registry, 28 Jul 2026).
 *  Do not invent names here; new concepts go through kernel admission first. */
export const KERNEL_EVENTS = {
  // Lead lifecycle
  LeadCreated: 'LeadCreated',
  StageTransitioned: 'StageTransitioned',
  // Front door → estimate
  BillUploaded: 'BillUploaded',
  EstimateGenerated: 'EstimateGenerated',
  CallBooked: 'CallBooked',
  // Survey → proposal → contract
  SurveyCompleted: 'SurveyCompleted',
  ProposalGenerated: 'ProposalGenerated',
  ProposalSent: 'ProposalSent',
  ContractSigned: 'ContractSigned',
  // Money
  DepositPaid: 'DepositPaid',
  FinalPaymentReceived: 'FinalPaymentReceived',
  // The field (AIField) — the evidence edge
  InstallScheduled: 'InstallScheduled',
  InstallStepCompleted: 'InstallStepCompleted',
  InverterConnected: 'InverterConnected',
  SignOffCaptured: 'SignOffCaptured',
  // Grant
  GrantReady: 'GrantReady',
  GrantStatusChanged: 'GrantStatusChanged',
  // Comms + consent (email only at launch — truth-pass)
  MessageSent: 'MessageSent',
  MessageReceived: 'MessageReceived',
  ConsentCaptured: 'ConsentCaptured',
  // Aftercare + growth loop
  ReviewRequested: 'ReviewRequested',
  ReviewReceived: 'ReviewReceived',
  // Human-in-the-loop (the constitutional brake, both already registered)
  EscalationRaised: 'EscalationRaised',
  ApprovalRequested: 'ApprovalRequested',
  ApprovalResolved: 'ApprovalResolved',
} as const;

export type KernelEventType = keyof typeof KERNEL_EVENTS;

/** App workflow stage → the kernel event that records the transition.
 *  (StageTransitioned additionally fires on EVERY move as the generic record.) */
export const STAGE_TO_EVENT: Record<string, KernelEventType> = {
  intake_complete: 'EstimateGenerated',
  survey_scheduled: 'CallBooked',
  survey_complete: 'SurveyCompleted',
  proposal_drafted: 'ProposalGenerated',
  proposal_sent: 'ProposalSent',
  approved: 'ContractSigned',
  deposit_paid: 'DepositPaid',
  install_scheduled: 'InstallScheduled',
  installed: 'InstallStepCompleted', // final stage completion; per-stage below
  final_paid: 'FinalPaymentReceived',
};

/** AIField → kernel payload contracts (refs only — this is the shape Sweep 8
 *  wires; defined NOW so the field capture and the record never diverge).
 *  Serials + model strings are equipment attributes, not personal data — they
 *  ride as-is. Signatures and notes are NOT refs: the artifact goes to
 *  storage / the app DB; the kernel gets the hash and the flags. */
export interface InstallStepCompletedPayload {
  lead_ref: string;            // app lead id (uuid) — never the customer's name
  stage: 'pre_install' | 'roof' | 'electrical' | 'commissioning' | 'handover';
  checks_done: number;
  photos_captured: number;     // count; images live in storage, not the chain
}

export interface InverterConnectedPayload {
  lead_ref: string;
  fitted_model: string;        // AS FITTED, off the rating plate (triple check)
  serial: string;              // equipment serial — feeds NC6 §5 + warranty
  matches_proposal: boolean;   // the triple check verdict
  mismatch_note_hash?: string; // sha256 of the installer's note — note text
                               // stays in the app DB; the chain proves it existed
}

export interface SignOffCapturedPayload {
  lead_ref: string;
  signature_hash: string;      // sha256 of the signature PNG — image in storage
  attested_by_ref: string;     // installer identity ref — ATTESTED, by name.
                               // Never "verified": occurrence is the frontier
                               // no record crosses (Decidability §5).
  signed_at: string;           // ISO timestamp (a claim; chain position is truth)
}

/** The self-improvement loop's kernel shape (Sweep 8): corrections are
 *  captured as app rows, aggregated into a weekly owner report, and any
 *  proposed prompt/rule change rides ApprovalRequested → human ApprovalResolved
 *  before activation. Self-healing ACTS, self-reporting LOGS, self-improvement
 *  PROPOSES — humans approve. The draft-first law applies to the system
 *  improving itself exactly as it applies to sending an email. */
export interface AgentCorrectionRef {
  agent_id: string;
  run_ref: string;             // agent_runs.id
  correction_hash: string;     // sha256 of the correction text (text in app DB)
}
