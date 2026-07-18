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
import { corsHeaders, log, HttpError, errorResponse, requireRole } from "../_shared/auth.ts";
import { callLLM, getActivePrompt, fillTemplate } from "../_shared/llm.ts";
import { sendEmail, wrapEmailHtml, buildWarrantyEmailHtml } from "../_shared/email.ts";

const FN = "agent-drain";

interface AgentRunParams {
  supabase: any;
  jobId: string;
  leadId: string | null;
  triggerData: any;
  agentId: string;
  /** agent_runs.id — pass to callLLM() so LLM cost gets recorded on this row */
  runId?: string;
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

    // Authz: cron path (empty body) accepts the service-role key.
    // Manual trigger path (lead_id + agent_id in body) requires admin role.
    const isManualTrigger = !!(manualLeadId && drainAgentId);
    const authHeader = req.headers.get("authorization") ?? "";
    const isServiceKey = !!serviceKey && authHeader === `Bearer ${serviceKey}`;

    if (isServiceKey) {
      // pg_cron / admin script using the service-role key — allowed.
    } else if (isManualTrigger) {
      // P0-2 fix: previously any authenticated user could trigger any agent
      // on any lead. Now requires admin role.
      await requireRole(req, ["admin"]);
    } else {
      // Cron-shaped body but caller is not the service-role key — require admin.
      await requireRole(req, ["admin"]);
    }

    log(FN, "info", "Drain started", { agentId: drainAgentId, triggerType, manual: isManualTrigger });

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
            runId: runRecord?.id,
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

async function handleProposalDrafter({ supabase, leadId, runId }: AgentRunParams): Promise<AgentRunResult> {
  if (!leadId) return { success: false, error: "No lead_id" };

  const { data: intake } = await supabase.from("lead_intake").select("*").eq("lead_id", leadId).single();
  if (!intake) return { success: false, error: "lead_intake not found" };

  const { data: survey } = await supabase.from("site_surveys").select("*").eq("lead_id", leadId).eq("status", "completed").order("created_at", { ascending: false }).limit(1).single();
  if (!survey) return { success: false, error: "No completed survey" };

  const { data: existingDraft } = await supabase.from("proposals").select("id").eq("lead_id", leadId).eq("status", "draft").limit(1);
  if (existingDraft && existingDraft.length > 0) return { success: true, outputs: { skipped: "draft exists" } };

  const { data: lead } = await supabase.from("leads").select("assigned_consultant_id, name, address, monthly_bill, annual_kwh").eq("id", leadId).single();

  const systemSize = survey.confirmed_system_size_kw || intake.estimated_system_size_kw || 6;
  const panelCount = survey.confirmed_panel_count || systemSize * 2;
  const grossCost = systemSize * 1800;
  const seaiGrant = Math.min(1800, Math.min(systemSize, 2) * 900);
  const netCost = grossCost - seaiGrant;

  // Phase 4: call LLM to draft a proposal narrative (falls back to deterministic text if LLM unavailable)
  let narrative = `Your ${systemSize}kWp solar system will generate approximately ${Math.round(systemSize * 950)} kWh per year, saving you ${eur(intake.estimated_annual_savings || 0)} annually. With the SEAI grant of ${eur(seaiGrant)}, your net cost is ${eur(netCost)} — payback in ${intake.estimated_payback_years || 7} years.`;

  const prompt = await getActivePrompt(supabase, "proposal_drafter");
  if (prompt) {
    const userPrompt = fillTemplate(prompt.user_prompt_template, {
      lead_name: lead?.name || "Customer",
      address: lead?.address || "",
      monthly_bill: lead?.monthly_bill || 0,
      annual_kwh: lead?.annual_kwh || intake.extracted_annual_kwh || 0,
      system_size_kw: systemSize,
      panel_count: panelCount,
      panel_model: "Longi Hi-MO 6 435W",
      inverter_model: "SolarEdge SE5K",
      battery_model: survey.confirmed_battery_kwh ? "Tesla Powerwall 3 (13.5kWh)" : "None",
      gross_cost: grossCost,
      seai_grant: seaiGrant,
      net_cost: netCost,
      annual_savings: intake.estimated_annual_savings || 0,
      payback_years: intake.estimated_payback_years || 7,
      twenty_year_savings: intake.estimated_20yr_savings || 0,
    });

    const llmResult = await callLLM({
      supabase,
      runId,
      agentId: "proposal_drafter",
      systemPrompt: prompt.system_prompt,
      userPrompt,
      model: prompt.model || undefined,
      maxTokens: 800,
      temperature: 0.4,
    });

    if (llmResult?.content) {
      narrative = llmResult.content;
      log(FN, "info", "Proposal narrative drafted by LLM", { leadId, model: llmResult.model, costUsd: llmResult.costUsd.toFixed(4) });
    } else {
      log(FN, "info", "LLM unavailable — using deterministic narrative", { leadId });
    }
  }

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
    narrative,  // Phase 4: store the LLM-drafted narrative on the proposal
  }).select().single();

  if (error) {
    // If the column doesn't exist yet, retry without narrative
    if (error.message.includes("narrative")) {
      const { data: proposal2, error: error2 } = await supabase.from("proposals").insert({
        lead_id: leadId, consultant_id: lead?.assigned_consultant_id,
        status: "draft",
        system_size_kw: systemSize, panel_count: panelCount,
        panel_model: "Longi Hi-MO 6 435W", inverter_model: "SolarEdge SE5K",
        battery_model: survey.confirmed_battery_kwh ? "Tesla Powerwall 3 (13.5kWh)" : null,
        gross_cost: grossCost, seai_grant: seaiGrant, net_cost: netCost,
        annual_savings: intake.estimated_annual_savings,
        payback_years: intake.estimated_payback_years,
        twenty_year_savings: intake.estimated_20yr_savings,
      }).select().single();
      if (error2) return { success: false, error: error2.message };
      return finishProposalDrafter(supabase, leadId, lead, intake, systemSize, panelCount, grossCost, seaiGrant, netCost, proposal2, narrative);
    }
    return { success: false, error: error.message };
  }

  return finishProposalDrafter(supabase, leadId, lead, intake, systemSize, panelCount, grossCost, seaiGrant, netCost, proposal, narrative);
}

async function finishProposalDrafter(supabase: any, leadId: string, lead: any, intake: any, systemSize: number, panelCount: number, grossCost: number, seaiGrant: number, netCost: number, proposal: any, narrative: string): Promise<AgentRunResult> {
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

  return { success: true, outputs: { proposalId: proposal.id, systemSize, netCost, status: "draft", narrativeLength: narrative.length } };
}

async function handleFollowUp({ supabase, runId }: AgentRunParams): Promise<AgentRunResult> {
  const { data: thresholds } = await supabase.from("follow_up_settings").select("*");
  if (!thresholds || thresholds.length === 0) return { success: true, outputs: { skipped: "no thresholds" } };

  let emailsSent = 0, leadsSkipped = 0;

  // Load the active prompt (if any) for follow_up agent
  const prompt = await getActivePrompt(supabase, "follow_up");

  for (const threshold of thresholds) {
    // Phase 4 fix: the column is `threshold_days`, not `days_threshold`.
    // The previous code read `threshold.days_threshold` which produced NaN,
    // causing zero leads to ever match. This was the #3 audit finding.
    const thresholdDays = threshold.threshold_days ?? threshold.days_threshold;
    if (!thresholdDays || isNaN(thresholdDays)) {
      log(FN, "warn", "Invalid threshold_days for stage", { stage: threshold.workflow_stage, value: threshold.threshold_days });
      continue;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - thresholdDays);

    const { data: staleLeads } = await supabase.from("leads")
      .select("id, name, email, workflow_stage, updated_at, address, monthly_bill, annual_kwh")
      .eq("workflow_stage", threshold.workflow_stage)
      .lt("updated_at", cutoff.toISOString());

    if (!staleLeads) continue;

    for (const lead of staleLeads) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: recent } = await supabase.from("touchpoints").select("id, summary")
        .eq("lead_id", lead.id).eq("agent_id", "follow_up")
        .gt("created_at", threeDaysAgo.toISOString()).limit(1);

      if (recent && recent.length > 0) { leadsSkipped++; continue; }

      // Phase 4: call LLM to draft a follow-up email (falls back to deterministic subject if LLM unavailable)
      let emailSubject = `Following up on your solar proposal, ${lead.name.split(' ')[0]}`;
      let emailBody = `Hi ${lead.name.split(' ')[0]},\n\nJust following up on your solar proposal. The SEAI grant rates may change, so if you're considering going ahead, now is a good time. Reply here or call us with any questions.\n\nBest regards,\nThe AISOLAR team`;

      if (prompt) {
        // Fetch proposal for context
        const { data: proposal } = await supabase.from("proposals").select("system_size_kw, net_cost, payback_years").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastTouch = recent?.[0]?.summary || "Initial proposal sent";

        const userPrompt = fillTemplate(prompt.user_prompt_template, {
          lead_name: lead.name,
          stage_label: threshold.workflow_stage,
          days_stale: thresholdDays,
          system_size_kw: proposal?.system_size_kw || 6,
          net_cost: proposal?.net_cost || 0,
          payback_years: proposal?.payback_years || 7,
          last_touchpoint_summary: lastTouch,
        });

        const llmResult = await callLLM({
          supabase, runId, agentId: "follow_up",
          systemPrompt: prompt.system_prompt, userPrompt,
          model: prompt.model || undefined,
          maxTokens: 500, temperature: 0.5,
        });

        if (llmResult?.content) {
          // Parse subject + body from LLM output (expecting "Subject: ...\n\nBody...")
          const content = llmResult.content.trim();
          const subjectMatch = content.match(/^(?:Subject|SUBJECT):\s*(.+)$/m);
          if (subjectMatch) {
            emailSubject = subjectMatch[1].trim();
            emailBody = content.replace(/^(?:Subject|SUBJECT):\s*.+\n*/i, '').trim();
          } else {
            emailBody = content;
          }
          log(FN, "info", "Follow-up email drafted by LLM", { leadId: lead.id, model: llmResult.model });
        }
      }

      log(FN, "info", "Follow-up queued", { leadId: lead.id, stage: threshold.workflow_stage, subject: emailSubject });

      // Phase 4: actually send the email via Postmark (was previously just logging)
      const emailHtml = `<p>Hi ${lead.name.split(' ')[0]},</p><p>${emailBody.split('\n').map(l => l || '</p><p>').join('</p><p>')}</p><p>Best regards,<br>The AISOLAR team</p>`;
      const emailResult = await sendEmail({
        to: lead.email,
        subject: emailSubject,
        htmlBody: wrapEmailHtml(emailHtml),
      });

      await supabase.from("touchpoints").insert({
        lead_id: lead.id, stage: threshold.workflow_stage, channel: "email", direction: "outbound",
        summary: `Follow-Up Agent sent "${emailSubject}" (${thresholdDays}d threshold).${emailResult.ok ? '' : ' [EMAIL FAILED: ' + emailResult.error + ']'}`,
        actor: "agent", agent_id: "follow_up",
        metadata: { subject: emailSubject, body: emailBody, messageId: emailResult.messageId, sent: emailResult.ok },
      });

      // Only bump updated_at if the email actually sent (so a Postmark failure retries tomorrow)
      if (emailResult.ok) {
        await supabase.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", lead.id);
        emailsSent++;
      }
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

  // Fetch everything we need to build the warranty email
  const { data: lead } = await supabase.from("leads").select("id, name, email, address, access_token").eq("id", leadId).single();
  if (!lead) return { success: false, error: "Lead not found" };

  const { data: proposal } = await supabase.from("proposals").select("system_size_kw, panel_model, inverter_model, battery_model").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!proposal) return { success: false, error: "No proposal found" };

  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + 7);

  // Phase 4: actually send the warranty + review request email via Postmark.
  // Previously this handler just wrote a touchpoint claiming "sent warranty
  // docs" but sent nothing — a lie. Now it really sends.
  const origin = Deno.env.get("SITE_URL") || "https://aisolar.ie";
  const portalUrl = lead.access_token ? `${origin}/my-projects?t=${lead.access_token}` : null;
  const reviewUrl = `${origin}/review?lead=${leadId}`;  // Placeholder — replace with real Google review link

  const htmlBody = buildWarrantyEmailHtml(
    lead.name,
    proposal.system_size_kw || 6,
    proposal.panel_model || "Longi Hi-MO 6",
    proposal.inverter_model || "SolarEdge SE5K",
    !!proposal.battery_model,
    reviewUrl,
    portalUrl,
  );

  const emailResult = await sendEmail({
    to: lead.email,
    subject: `Your solar system is live! Warranty docs + review request`,
    htmlBody: wrapEmailHtml(htmlBody),
  });

  if (!emailResult.ok) {
    log(FN, "error", "Warranty email failed to send", { leadId, error: emailResult.error });
    // Don't return failure — we still want the touchpoint logged so it doesn't retry forever.
    // But mark it clearly in the summary.
  } else {
    log(FN, "info", "Warranty email sent", { leadId, messageId: emailResult.messageId });
  }

  await supabase.from("touchpoints").insert({
    lead_id: leadId, stage: "installed", channel: "email", direction: "outbound",
    summary: `PostInstall Agent ${emailResult.ok ? 'sent' : 'FAILED to send'} warranty docs. Review request scheduled for ${reviewDate.toLocaleDateString("en-IE")}.`,
    actor: "agent", agent_id: "post_install",
    metadata: { messageId: emailResult.messageId, sent: emailResult.ok, error: emailResult.error, reviewUrl, portalUrl },
  });

  await supabase.from("activity_logs").insert({
    lead_id: leadId, action_type: "post_install_warranty_sent",
    description: `Warranty email ${emailResult.ok ? 'sent' : 'FAILED'} (${emailResult.messageId || 'no message ID'}). Review request scheduled for ${reviewDate.toLocaleDateString("en-IE")}.`,
  });

  // Schedule a review-request touchpoint for 7 days later (the Follow-Up Agent
  // won't pick this up because it's stage-gated, but we record the intent).
  if (emailResult.ok) {
    await supabase.from("notifications").insert({
      user_id: null,  // system notification
      type: "review_request_scheduled",
      title: "Review request scheduled",
      message: `PostInstall Agent scheduled a review request for ${lead.name} on ${reviewDate.toLocaleDateString("en-IE")}.`,
      related_lead_id: leadId,
    });
  }

  return { success: true, outputs: { warrantySent: emailResult.ok, messageId: emailResult.messageId, reviewScheduledFor: reviewDate.toISOString() } };
}

async function handleCustomerDigest({ supabase }: AgentRunParams): Promise<AgentRunResult> {
  const { data: activeLeads } = await supabase.from("leads")
    .select("id, name, email, workflow_stage, address, access_token")
    .not("workflow_stage", "in", '("completed","final_paid","new")');

  if (!activeLeads) return { success: true, outputs: { emailsSent: 0 } };

  let emailsSent = 0;
  let emailsFailed = 0;
  for (const lead of activeLeads) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: recent } = await supabase.from("touchpoints").select("id")
      .eq("lead_id", lead.id).gt("created_at", twoDaysAgo.toISOString()).limit(1);
    if (recent && recent.length > 0) continue;

    // Phase 4: actually send the weekly digest email
    const origin = Deno.env.get("SITE_URL") || "https://aisolar.ie";
    const portalUrl = lead.access_token ? `${origin}/my-projects?t=${lead.access_token}` : null;
    const stageLabel = lead.workflow_stage.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    const emailHtml = `
      <h2 style="color: #111827; margin-top: 0;">Your weekly solar update, ${lead.name.split(' ')[0]}</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Here's your weekly progress update on your solar project. Your project is currently at the <strong>${stageLabel}</strong> stage.
      </p>
      <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <div style="font-size: 36px; margin-bottom: 8px;">📊</div>
        <h3 style="margin: 0; color: #065f46;">Current stage: ${stageLabel}</h3>
        <p style="color: #047857; margin: 8px 0 0 0;">We're progressing your solar installation. No action needed from you right now.</p>
      </div>
      ${portalUrl ? `<div style="text-align: center; margin: 32px 0;"><a href="${portalUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View your project portal</a></div>` : ''}
      <p style="color: #6b7280; font-size: 14px;">If you have any questions, just reply to this email. We'll get back to you within 1 business day.</p>
    `;

    const emailResult = await sendEmail({
      to: lead.email,
      subject: `Your weekly solar update — ${stageLabel}`,
      htmlBody: wrapEmailHtml(emailHtml),
    });

    if (!emailResult.ok) emailsFailed++;

    await supabase.from("touchpoints").insert({
      lead_id: lead.id, stage: lead.workflow_stage, channel: "email", direction: "outbound",
      summary: `Customer Digest Agent ${emailResult.ok ? 'sent' : 'FAILED to send'} weekly update (stage: ${lead.workflow_stage}).`,
      actor: "agent", agent_id: "customer_digest",
      metadata: { messageId: emailResult.messageId, sent: emailResult.ok, error: emailResult.error },
    });
    if (emailResult.ok) emailsSent++;
  }

  return { success: true, outputs: { emailsSent, emailsFailed } };
}

async function handleStaleLeadEscalator({ supabase }: AgentRunParams): Promise<AgentRunResult> {
  const { data: thresholds } = await supabase.from("follow_up_settings").select("*");
  if (!thresholds) return { success: true, outputs: { escalated: 0 } };

  let escalated = 0;
  for (const threshold of thresholds) {
    // Phase 4 fix: column is `threshold_days`, not `days_threshold`
    const thresholdDays = threshold.threshold_days ?? threshold.days_threshold;
    if (!thresholdDays || isNaN(thresholdDays)) continue;

    const doubleDays = thresholdDays * 2;
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
    .select("id, invoice_number, lead_id, total_amount, deposit_amount, final_amount, deposit_paid, final_paid, created_at")
    .or("deposit_paid.eq.false,final_paid.eq.false");

  if (!unpaid) return { success: true, outputs: { remindersSent: 0 } };

  let remindersSent = 0;
  let emailsFailed = 0;
  for (const invoice of unpaid) {
    const daysOverdue = Math.floor((Date.now() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24));

    let tone = "", subjectLine = "";
    if (daysOverdue >= 45) { tone = "final_demand"; subjectLine = `Final notice: Invoice ${invoice.invoice_number} overdue`; }
    else if (daysOverdue >= 30) { tone = "firm"; subjectLine = `Payment overdue: Invoice ${invoice.invoice_number}`; }
    else if (daysOverdue >= 14) { tone = "firm"; subjectLine = `Reminder: Invoice ${invoice.invoice_number} payment due`; }
    else if (daysOverdue >= 7) { tone = "friendly"; subjectLine = `Friendly reminder: Invoice ${invoice.invoice_number}`; }
    else continue;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recent } = await supabase.from("touchpoints").select("id")
      .eq("lead_id", invoice.lead_id).eq("agent_id", "payment_reminder")
      .gt("created_at", sevenDaysAgo.toISOString()).limit(1);
    if (recent && recent.length > 0) continue;

    // Fetch lead for email + portal URL
    const { data: lead } = await supabase.from("leads").select("name, email, access_token").eq("id", invoice.lead_id).maybeSingle();
    if (!lead?.email) {
      log(FN, "warn", "No email on lead — skipping payment reminder", { leadId: invoice.lead_id, invoiceId: invoice.id });
      continue;
    }

    const balanceDue = (invoice.final_amount ?? ((invoice.total_amount || 0) - (invoice.deposit_amount || 0))) || 0;
    const origin = Deno.env.get("SITE_URL") || "https://aisolar.ie";
    const portalUrl = lead.access_token ? `${origin}/my-projects?t=${lead.access_token}` : null;

    log(FN, "info", "Sending payment reminder", { invoiceId: invoice.id, daysOverdue, tone });

    // Build + send the email
    const emailHtml = `
      <h2 style="color: #111827; margin-top: 0;">Hi ${lead.name.split(' ')[0]},</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        ${tone === 'friendly'
          ? 'Just a friendly reminder that your invoice is now ' + daysOverdue + ' days overdue. No worries if you\'ve already paid!'
          : tone === 'firm'
          ? 'Your invoice is ' + daysOverdue + ' days overdue. Please complete payment to avoid service interruption.'
          : 'This is a final notice. Your invoice is ' + daysOverdue + ' days overdue. Immediate payment is required.'}
      </p>
      <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #111827;">Payment details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Invoice number:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.invoice_number}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Total:</td><td style="padding: 8px 0; text-align: right;">€${(invoice.total_amount || 0).toLocaleString()}</td></tr>
          <tr style="border-top: 2px solid #e5e7eb;"><td style="padding: 12px 0 8px 0; color: #111827; font-weight: 600;">Balance due:</td><td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 20px; color: #dc2626;">€${balanceDue.toLocaleString()}</td></tr>
        </table>
      </div>
      ${portalUrl ? `<div style="text-align: center; margin: 32px 0;"><a href="${portalUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Pay now</a></div>` : ''}
      <p style="color: #6b7280; font-size: 14px;">If you have any questions about your invoice, please reply to this email or call us.</p>
    `;

    const emailResult = await sendEmail({
      to: lead.email,
      subject: subjectLine,
      htmlBody: wrapEmailHtml(emailHtml),
    });

    if (!emailResult.ok) emailsFailed++;

    await supabase.from("touchpoints").insert({
      lead_id: invoice.lead_id, stage: "approved", channel: "email", direction: "outbound",
      summary: `Payment Reminder Agent ${emailResult.ok ? 'sent' : 'FAILED to send'} ${tone} reminder for ${invoice.invoice_number} (${daysOverdue}d overdue).`,
      actor: "agent", agent_id: "payment_reminder",
      metadata: { invoiceId: invoice.id, subject: subjectLine, tone, daysOverdue, balanceDue, messageId: emailResult.messageId, sent: emailResult.ok, error: emailResult.error },
    });
    if (emailResult.ok) remindersSent++;
  }

  return { success: true, outputs: { remindersSent, emailsFailed } };
}
