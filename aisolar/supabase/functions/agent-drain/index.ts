/**
 * agent-drain — the kernel worker.
 *
 * Called every minute by pg_cron. Claims jobs from agent_queue using
 * claim_next_agent_job(), dispatches to the right agent handler, writes
 * to agent_runs, calls complete_agent_job() or fail_agent_job().
 *
 * This is the single entry point for ALL agent execution. No agent ever
 * runs except through this function.
 *
 * Idempotency: each agent checks for existing side effects before acting.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders, log, HttpError, errorResponse } from "../_shared/auth.ts";

const FN = "agent-drain";

interface AgentRunParams {
  supabase: any;
  jobId: string;
  leadId: string | null;
  triggerData: any;
  agentId: string;
}

interface AgentRunResult {
  success: boolean;
  outputs?: any;
  error?: string;
}

// Agent handler registry
const AGENT_HANDLERS: Record<string, (params: AgentRunParams) => Promise<AgentRunResult>> = {
  lead_intake: handleLeadIntake,
  survey_scheduler: handleSurveyScheduler,
  proposal_drafter: handleProposalDrafter,
  follow_up: handleFollowUp,
  grant_submitter: handleGrantSubmitter,
  install_coordinator: handleInstallCoordinator,
  post_install: handlePostInstall,
  customer_digest: handleCustomerDigest,
  stale_lead_escalator: handleStaleLeadEscalator,
  payment_reminder: handlePaymentReminder,
};

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Authentication required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body = cron drain */ }

    const drainAgentId = body.agent_id;
    const manualLeadId = body.lead_id;
    const triggerType = body.trigger_type || "cron";

    log(FN, "info", "Drain started", { agentId: drainAgentId, triggerType });

    // If manual trigger for a specific lead, enqueue then drain
    if (manualLeadId && drainAgentId) {
      await supabase.from("agent_queue").insert({
        agent_id: drainAgentId,
        lead_id: manualLeadId,
        trigger_data: { trigger_type: "manual", triggered_by: "admin_ui" },
        priority: 1, // high priority for manual triggers
      });
    }

    const agentsToDrain = drainAgentId ? [drainAgentId] : Object.keys(AGENT_HANDLERS);
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const agentId of agentsToDrain) {
      for (let i = 0; i < 5; i++) {
        const { data: job, error } = await supabase.rpc("claim_next_agent_job", {
          p_agent_id: agentId,
          p_worker_id: `drain_${Date.now()}_${i}`,
        });

        if (error || !job) break;

        processed++;
        const handler = AGENT_HANDLERS[agentId];
        if (!handler) {
          await supabase.rpc("fail_agent_job", { p_job_id: job.id, p_error: `No handler for ${agentId}` });
          failed++;
          continue;
        }

        // Insert agent_runs row
        const { data: runRecord } = await supabase.from("agent_runs").insert({
          agent_id: agentId,
          trigger_type: triggerType,
          trigger_detail: job.trigger_data?.trigger_type || "auto",
          status: "running",
          lead_id: job.lead_id,
          inputs: job.trigger_data,
          started_at: new Date().toISOString(),
        }).select().single();

        const startTime = Date.now();

        try {
          const result = await handler({
            supabase,
            jobId: job.id,
            leadId: job.lead_id,
            triggerData: job.trigger_data || {},
            agentId,
          });

          const durationMs = Date.now() - startTime;

          if (result.success) {
            await supabase.rpc("complete_agent_job", {
              p_job_id: job.id,
              p_outputs: result.outputs || {},
            });

            if (runRecord) {
              await supabase.from("agent_runs").update({
                status: "success",
                outputs: result.outputs || {},
                completed_at: new Date().toISOString(),
                duration_ms: durationMs,
              }).eq("id", runRecord.id);
            }

            succeeded++;
            log(FN, "info", "Agent succeeded", { agentId, leadId: job.lead_id, durationMs });
          } else {
            throw new Error(result.error || "Agent returned failure");
          }
        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          const errorMsg = err.message || "Unknown error";

          await supabase.rpc("fail_agent_job", { p_job_id: job.id, p_error: errorMsg });

          if (runRecord) {
            await supabase.from("agent_runs").update({
              status: "failed",
              error_message: errorMsg,
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
            }).eq("id", runRecord.id);
          }

          failed++;
          log(FN, "error", "Agent failed", { agentId, leadId: job.lead_id, error: errorMsg });
        }
      }
    }

    log(FN, "info", "Drain complete", { processed, succeeded, failed });

    return new Response(JSON.stringify({ processed, succeeded, failed, drainedAt: new Date().toISOString() }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse(err, headers);
  }
});

// ============================================================================
// AGENT IMPLEMENTATIONS — all 10
// ============================================================================

async function handleLeadIntake({ supabase, leadId }: AgentRunParams): Promise<AgentRunResult> {
  if (!leadId) return { success: false, error: "No lead_id" };

  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (error || !lead) return { success: false, error: `Lead not found: ${error?.message}` };

  // Idempotency
  const { data: existing } = await supabase.from("lead_intake").select("id").eq("lead_id", leadId).single();
  if (existing) return { success: true, outputs: { skipped: "lead_intake already exists" } };

  // Dedupe by MPRN
  let duplicateOf: string | null = null;
  if (lead.mprn) {
    const { data: dupes } = await supabase.from("leads").select("id").eq("mprn", lead.mprn).neq("id", leadId).limit(1);
    if (dupes && dupes.length > 0) duplicateOf = dupes[0].id;
  }

  // Score
  let score = 50;
  if (lead.monthly_bill > 250) score += 20;
  if (lead.monthly_bill > 350) score += 10;
  if (lead.mprn) score += 10;
  if (lead.source === "bill_upload") score += 10;
  score = Math.min(100, score);

  await supabase.from("leads").update({ score }).eq("id", leadId);

  // Calculate estimate
  const monthlyBill = Number(lead.monthly_bill) || 0;
  const annualKwh = monthlyBill > 0 ? (monthlyBill * 12) / 0.35 : 0;
  const systemSize = Math.max(3, Math.min(12, Math.round(annualKwh / 950)));
  const annualProduction = systemSize * 950;
  const annualSavings = Math.round(annualProduction * 0.35 * 0.7);
  const netCost = systemSize * 1800 - 1800;
  const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;

  const { error: intakeError } = await supabase.from("lead_intake").insert({
    lead_id: leadId, source: lead.source || "manual",
    extracted_monthly_bill: monthlyBill,
    extracted_annual_kwh: Math.round(annualKwh),
    extracted_mprn: lead.mprn,
    extracted_account_name: lead.name,
    extracted_address: lead.address,
    extraction_confidence: "medium",
    estimated_system_size_kw: systemSize,
    estimated_annual_savings: annualSavings,
    estimated_payback_years: paybackYears,
    estimated_20yr_savings: annualSavings * 20 - netCost,
    solar_offset_pct: annualKwh > 0 ? Math.min(85, Math.round((annualProduction / annualKwh) * 100)) : 0,
  });

  if (intakeError) return { success: false, error: intakeError.message };

  await supabase.from("activity_logs").insert({
    lead_id: leadId, action_type: "lead_intake_processed",
    description: `Lead Intake Agent normalized data. Score: ${score}. Est: ${systemSize}kWp. Dupe: ${duplicateOf ? "yes" : "no"}.`,
  });

  await supabase.from("touchpoints").insert({
    lead_id: leadId, stage: "new", channel: "portal", direction: "outbound",
    summary: `Lead Intake Agent processed bill. Score: ${score}. Est: ${systemSize}kWp, ${eur(annualSavings)}/yr.`,
    actor: "agent", agent_id: "lead_intake",
  });

  return { success: true, outputs: { score, systemSize, annualSavings, duplicateOf } };
}

async function handleSurveyScheduler({ supabase, leadId }: AgentRunParams): Promise<AgentRunResult> {
  if (!leadId) return { success: false, error: "No lead_id" };

  const { data: installers } = await supabase.from("installers").select("id, user_id").eq("availability_status", "available").limit(1);
  if (!installers || installers.length === 0) return { success: false, error: "No available installers" };

  const { data: existing } = await supabase.from("site_surveys").select("id").eq("lead_id", leadId).in("status", ["draft", "scheduled"]).limit(1);
  if (existing && existing.length > 0) return { success: true, outputs: { skipped: "survey exists" } };

  const slot = new Date();
  slot.setDate(slot.getDate() + 5);
  slot.setHours(10, 0, 0, 0);

  const { error } = await supabase.from("site_surveys").insert({
    lead_id: leadId, surveyor_id: installers[0].user_id, status: "scheduled", scheduled_date: slot.toISOString(),
  });
  if (error) return { success: false, error: error.message };

  await supabase.from("leads").update({ workflow_stage: "survey_scheduled" }).eq("id", leadId);

  await supabase.from("touchpoints").insert({
    lead_id: leadId, stage: "survey_scheduled", channel: "email", direction: "outbound",
    summary: `Survey Scheduler Agent booked site survey for ${slot.toLocaleDateString("en-IE")}.`,
    actor: "agent", agent_id: "survey_scheduler",
  });

  return { success: true, outputs: { surveyDate: slot.toISOString() } };
}

async function handleProposalDrafter({ supabase, leadId }: AgentRunParams): Promise<AgentRunResult> {
  if (!leadId) return { success: false, error: "No lead_id" };

  const { data: intake } = await supabase.from("lead_intake").select("*").eq("lead_id", leadId).single();
  if (!intake) return { success: false, error: "lead_intake not found" };

  const { data: survey } = await supabase.from("site_surveys").select("*").eq("lead_id", leadId).eq("status", "completed").order("created_at", { ascending: false }).limit(1).single();
  if (!survey) return { success: false, error: "No completed survey" };

  const { data: existingDraft } = await supabase.from("proposals").select("id").eq("lead_id", leadId).eq("status", "draft").limit(1);
  if (existingDraft && existingDraft.length > 0) return { success: true, outputs: { skipped: "draft exists" } };

  const { data: lead } = await supabase.from("leads").select("assigned_consultant_id").eq("id", leadId).single();

  const systemSize = survey.confirmed_system_size_kw || intake.estimated_system_size_kw || 6;
  const panelCount = survey.confirmed_panel_count || systemSize * 2;
  const grossCost = systemSize * 1800;
  const seaiGrant = Math.min(1800, Math.min(systemSize, 2) * 900);
  const netCost = grossCost - seaiGrant;

  const { data: proposal, error } = await supabase.from("proposals").insert({
    lead_id: leadId, consultant_id: lead?.assigned_consultant_id,
    status: "draft", // CRITICAL: never auto-send
    system_size_kw: systemSize, panel_count: panelCount,
    panel_model: "Longi Hi-MO 6 435W", inverter_model: "SolarEdge SE5K",
    battery_model: survey.confirmed_battery_kwh ? "Tesla Powerwall 3 (13.5kWh)" : null,
    gross_cost: grossCost, seai_grant: seaiGrant, net_cost: netCost,
    annual_savings: intake.estimated_annual_savings,
    payback_years: intake.estimated_payback_years,
    twenty_year_savings: intake.estimated_20yr_savings,
  }).select().single();

  if (error) return { success: false, error: error.message };

  await supabase.from("lead_intake").update({
    finalized_panel_model: "Longi Hi-MO 6 435W",
    finalized_inverter_model: "SolarEdge SE5K",
    finalized_total_cost: grossCost, finalized_seai_grant: seaiGrant, finalized_net_cost: netCost,
  }).eq("lead_id", leadId);

  await supabase.from("leads").update({ workflow_stage: "proposal_drafted" }).eq("id", leadId);

  if (lead?.assigned_consultant_id) {
    await supabase.from("notifications").insert({
      user_id: lead.assigned_consultant_id,
      type: "proposal_drafted",
      title: "Proposal draft ready for review",
      message: `Proposal Drafter Agent drafted a ${systemSize}kWp proposal (${eur(netCost)} net). Review and send.`,
      related_lead_id: leadId,
    });
  }

  await supabase.from("touchpoints").insert({
    lead_id: leadId, stage: "proposal_drafted", channel: "portal", direction: "outbound",
    summary: `Proposal Drafter Agent drafted ${systemSize}kWp proposal (${eur(netCost)}). Awaiting review.`,
    actor: "agent", agent_id: "proposal_drafter",
  });

  return { success: true, outputs: { proposalId: proposal.id, systemSize, netCost, status: "draft" } };
}

async function handleFollowUp({ supabase }: AgentRunParams): Promise<AgentRunResult> {
  const { data: thresholds } = await supabase.from("follow_up_settings").select("*");
  if (!thresholds || thresholds.length === 0) return { success: true, outputs: { skipped: "no thresholds" } };

  let emailsSent = 0, leadsSkipped = 0;

  for (const threshold of thresholds) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - threshold.days_threshold);

    const { data: staleLeads } = await supabase.from("leads")
      .select("id, name, email, workflow_stage, updated_at")
      .eq("workflow_stage", threshold.workflow_stage)
      .lt("updated_at", cutoff.toISOString());

    if (!staleLeads) continue;

    for (const lead of staleLeads) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: recent } = await supabase.from("touchpoints").select("id")
        .eq("lead_id", lead.id).eq("agent_id", "follow_up")
        .gt("created_at", threeDaysAgo.toISOString()).limit(1);

      if (recent && recent.length > 0) { leadsSkipped++; continue; }

      const { data: template } = await supabase.from("email_templates").select("*")
        .eq("type", `follow_up_${threshold.workflow_stage}`).eq("active", true).single();

      log(FN, "info", "Follow-up queued", { leadId: lead.id, stage: threshold.workflow_stage });

      await supabase.from("touchpoints").insert({
        lead_id: lead.id, stage: threshold.workflow_stage, channel: "email", direction: "outbound",
        summary: `Follow-Up Agent sent "${template?.subject || 'follow-up'}" (${threshold.days_threshold}d threshold).`,
        actor: "agent", agent_id: "follow_up",
      });

      await supabase.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", lead.id);
      emailsSent++;
    }
  }

  return { success: true, outputs: { emailsSent, leadsSkipped } };
}

async function handleGrantSubmitter({ supabase, leadId }: AgentRunParams): Promise<AgentRunResult> {
  if (!leadId) return { success: false, error: "No lead_id" };

  const { data: existing } = await supabase.from("seai_applications").select("id").eq("lead_id", leadId).limit(1);
  if (existing && existing.length > 0) return { success: true, outputs: { skipped: "SEAI app exists" } };

  const { data: proposal } = await supabase.from("proposals").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).single();
  if (!proposal) return { success: false, error: "No proposal" };

  const { error } = await supabase.from("seai_applications").insert({
    lead_id: leadId, proposal_id: proposal.id, status: "in_progress",
    grant_amount: proposal.seai_grant, system_size_kw: proposal.system_size_kw,
  });
  if (error) return { success: false, error: error.message };

  await supabase.from("touchpoints").insert({
    lead_id: leadId, stage: "approved", channel: "email", direction: "outbound",
    summary: `SEAI Grant Agent started application for ${eur(proposal.seai_grant)} grant.`,
    actor: "agent", agent_id: "grant_submitter",
  });

  return { success: true, outputs: { grantAmount: proposal.seai_grant } };
}

async function handleInstallCoordinator({ supabase, leadId }: AgentRunParams): Promise<AgentRunResult> {
  if (!leadId) return { success: false, error: "No lead_id" };

  const { data: existing } = await supabase.from("assignments").select("id").eq("lead_id", leadId).limit(1);
  if (existing && existing.length > 0) return { success: true, outputs: { skipped: "assignment exists" } };

  const { data: installers } = await supabase.from("installers").select("id, user_id").eq("availability_status", "available").limit(1);
  if (!installers || installers.length === 0) return { success: false, error: "No available installers" };

  const installDate = new Date();
  installDate.setDate(installDate.getDate() + 28);
  installDate.setHours(8, 0, 0, 0);

  const { error } = await supabase.from("assignments").insert({
    lead_id: leadId, installer_id: installers[0].id, status: "pending", scheduled_date: installDate.toISOString(),
  });
  if (error) return { success: false, error: error.message };

  await supabase.from("leads").update({ workflow_stage: "install_scheduled" }).eq("id", leadId);

  await supabase.from("touchpoints").insert({
    lead_id: leadId, stage: "install_scheduled", channel: "email", direction: "outbound",
    summary: `Install Coordinator Agent scheduled install for ${installDate.toLocaleDateString("en-IE")}.`,
    actor: "agent", agent_id: "install_coordinator",
  });

  return { success: true, outputs: { installDate: installDate.toISOString() } };
}

async function handlePostInstall({ supabase, leadId }: AgentRunParams): Promise<AgentRunResult> {
  if (!leadId) return { success: false, error: "No lead_id" };

  const { data: existing } = await supabase.from("touchpoints").select("id").eq("lead_id", leadId).eq("agent_id", "post_install").limit(1);
  if (existing && existing.length > 0) return { success: true, outputs: { skipped: "already triggered" } };

  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + 7);

  log(FN, "info", "Warranty email queued", { leadId });

  await supabase.from("touchpoints").insert({
    lead_id: leadId, stage: "installed", channel: "email", direction: "outbound",
    summary: `PostInstall Agent sent warranty docs. Review request scheduled for ${reviewDate.toLocaleDateString("en-IE")}.`,
    actor: "agent", agent_id: "post_install",
  });

  await supabase.from("activity_logs").insert({
    lead_id: leadId, action_type: "post_install_warranty_sent",
    description: `Warranty email sent. Review request scheduled for ${reviewDate.toLocaleDateString("en-IE")}.`,
  });

  return { success: true, outputs: { warrantySent: true, reviewScheduledFor: reviewDate.toISOString() } };
}

async function handleCustomerDigest({ supabase }: AgentRunParams): Promise<AgentRunResult> {
  const { data: activeLeads } = await supabase.from("leads")
    .select("id, name, email, workflow_stage")
    .not("workflow_stage", "in", '("completed","final_paid","new")');

  if (!activeLeads) return { success: true, outputs: { emailsSent: 0 } };

  let emailsSent = 0;
  for (const lead of activeLeads) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: recent } = await supabase.from("touchpoints").select("id")
      .eq("lead_id", lead.id).gt("created_at", twoDaysAgo.toISOString()).limit(1);
    if (recent && recent.length > 0) continue;

    await supabase.from("touchpoints").insert({
      lead_id: lead.id, stage: lead.workflow_stage, channel: "email", direction: "outbound",
      summary: `Customer Digest Agent sent weekly update (stage: ${lead.workflow_stage}).`,
      actor: "agent", agent_id: "customer_digest",
    });
    emailsSent++;
  }

  return { success: true, outputs: { emailsSent } };
}

async function handleStaleLeadEscalator({ supabase }: AgentRunParams): Promise<AgentRunResult> {
  const { data: thresholds } = await supabase.from("follow_up_settings").select("*");
  if (!thresholds) return { success: true, outputs: { escalated: 0 } };

  let escalated = 0;
  for (const threshold of thresholds) {
    const doubleDays = threshold.days_threshold * 2;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - doubleDays);

    const { data: veryStale } = await supabase.from("leads")
      .select("id, name, assigned_consultant_id, workflow_stage")
      .eq("workflow_stage", threshold.workflow_stage)
      .lt("updated_at", cutoff.toISOString());

    if (!veryStale) continue;

    for (const lead of veryStale) {
      if (!lead.assigned_consultant_id) continue;

      const { data: existing } = await supabase.from("notifications").select("id")
        .eq("user_id", lead.assigned_consultant_id).eq("type", "stale_escalation")
        .eq("related_lead_id", lead.id).gt("created_at", cutoff.toISOString()).limit(1);
      if (existing && existing.length > 0) continue;

      await supabase.from("notifications").insert({
        user_id: lead.assigned_consultant_id, type: "stale_escalation",
        title: "Stale lead needs attention",
        message: `${lead.name} at ${lead.workflow_stage} for ${doubleDays}+ days. Manual follow-up required.`,
        related_lead_id: lead.id,
      });
      escalated++;
    }
  }

  return { success: true, outputs: { escalated } };
}

async function handlePaymentReminder({ supabase }: AgentRunParams): Promise<AgentRunResult> {
  const { data: unpaid } = await supabase.from("invoices")
    .select("id, invoice_number, lead_id, deposit_paid, final_paid, created_at")
    .or("deposit_paid.eq.false,final_paid.eq.false");

  if (!unpaid) return { success: true, outputs: { remindersSent: 0 } };

  let remindersSent = 0;
  for (const invoice of unpaid) {
    const daysOverdue = Math.floor((Date.now() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24));

    let tone = "", templateType = "";
    if (daysOverdue >= 45) { tone = "final_demand"; templateType = "payment_reminder_final"; }
    else if (daysOverdue >= 30) { tone = "firm"; templateType = "payment_reminder_30"; }
    else if (daysOverdue >= 14) { tone = "firm"; templateType = "payment_reminder_14"; }
    else if (daysOverdue >= 7) { tone = "friendly"; templateType = "payment_reminder_7"; }
    else continue;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recent } = await supabase.from("touchpoints").select("id")
      .eq("lead_id", invoice.lead_id).eq("agent_id", "payment_reminder")
      .gt("created_at", sevenDaysAgo.toISOString()).limit(1);
    if (recent && recent.length > 0) continue;

    log(FN, "info", "Payment reminder queued", { invoiceId: invoice.id, daysOverdue, tone });

    await supabase.from("touchpoints").insert({
      lead_id: invoice.lead_id, stage: "approved", channel: "email", direction: "outbound",
      summary: `Payment Reminder Agent sent ${tone} reminder for ${invoice.invoice_number} (${daysOverdue}d overdue).`,
      actor: "agent", agent_id: "payment_reminder",
    });
    remindersSent++;
  }

  return { success: true, outputs: { remindersSent } };
}
