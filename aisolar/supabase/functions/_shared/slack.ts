/**
 * slack.ts — Shared Slack webhook poster (the ops nervous system).
 *
 * Sweep 8: agents that run without a human present (agent-drain, the monitoring
 * crons, the learning loop) need somewhere to speak and somewhere Cal can say no.
 * That surface is Slack. Canonical truth still lives in git + Supabase — this
 * carries the live flow and the approval spine ONLY (docs/SLACK_OPS.md).
 *
 * THE CONTRACT, ENFORCED: every post carries WHO · WHAT · PROOF · ASK, or it does
 * not post. `proof` is required at the type level AND checked at runtime — the
 * same truth-pass the code holds: nothing claims "sent / live / done" without a
 * SHA, a row count, or a URL behind it.
 *
 * Channels are one-purpose (never invent a fourth):
 *   build      — work landed, with proof
 *   decisions  — needs Cal's ✅; nothing ships without it
 *   monitoring — health. GREEN = SILENCE. Post only on state change or breach.
 *
 * Secrets: SLACK_BUILD_WEBHOOK / SLACK_DECISIONS_WEBHOOK / SLACK_MONITORING_WEBHOOK
 *   supabase secrets set SLACK_MONITORING_WEBHOOK=https://hooks.slack.com/services/...
 * A webhook URL is a key: never in git, never in a payload, never in a log line.
 *
 * Usage:
 *   import { postToSlack } from "../_shared/slack.ts";
 *   await postToSlack({
 *     channel: "monitoring",
 *     who: "agent-drain",
 *     what: "Queue depth 41 — above the 25 threshold",
 *     proof: "select count(*) from agent_queue where status='pending'",
 *     ask: "Investigate before the next drain",
 *     alert: true,
 *   });
 */

import { log } from "./auth.ts";

const FN = "slack";

export type SlackChannel = "build" | "decisions" | "monitoring";

const WEBHOOK_ENV: Record<SlackChannel, string> = {
  build: "SLACK_BUILD_WEBHOOK",
  decisions: "SLACK_DECISIONS_WEBHOOK",
  monitoring: "SLACK_MONITORING_WEBHOOK",
};

interface PostToSlackParams {
  channel: SlackChannel;
  /** Which agent is speaking — never "the system". */
  who: string;
  /** One line. What happened, or what is being asked. */
  what: string;
  /** REQUIRED. Commit SHA, row count, query, URL. No proof, no post. */
  proof: string;
  /** The decision, when it needs Cal's yes. Omit when nothing is asked. */
  ask?: string;
  /** Optional headline above the fields. */
  title?: string;
  /** Red. Use ONLY on state change or threshold breach — green is silence. */
  alert?: boolean;
}

interface PostToSlackResult {
  ok: boolean;
  error?: string;
}

interface RequestApprovalParams {
  /** kernel.commands.command_id — the pending intent this button resolves. */
  commandId: string;
  who: string;
  what: string;
  proof: string;
  title?: string;
}

/**
 * requestApproval — post a decision with real Approve/Reject buttons.
 *
 * THIS IS THE VETO, MADE AUTONOMOUS. The button carries the kernel command_id;
 * Cal's tap goes Slack → `slack-approve` → kernel.commands.status → the 0012
 * trigger emits CommandResolved onto the chain. No Claude in the loop: the
 * power to stop survives everyone's absence, and every use of it is receipted.
 *
 * Precondition: the caller has ALREADY written the command as `pending`. Never
 * post a button for an intent that does not exist — a tap must always resolve
 * something real.
 */
export async function requestApproval(params: RequestApprovalParams): Promise<PostToSlackResult> {
  const { commandId, who, what, proof, title } = params;
  if (!proof?.trim()) return { ok: false, error: "proof is required — no post without proof" };
  if (!commandId?.trim()) return { ok: false, error: "commandId is required — a button must resolve a real command" };

  const url = Deno.env.get(WEBHOOK_ENV.decisions);
  if (!url) return { ok: false, error: "Slack not configured for #decisions" };

  const body = {
    text: `Decision needed: ${what}`, // notification fallback
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*${title ?? "Decision needed"}*`,
            `*WHO* ${who}`,
            `*WHAT* ${what}`,
            `*PROOF* ${proof}`,
          ].join("\n"),
        },
      },
      {
        type: "actions",
        elements: [
          { type: "button", action_id: "approve", style: "primary",
            text: { type: "plain_text", text: "Approve" }, value: commandId },
          { type: "button", action_id: "reject", style: "danger",
            text: { type: "plain_text", text: "Reject" }, value: commandId },
        ],
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text:
          `_Nothing ships without your tick. This one resolves kernel command \`${commandId.slice(0, 8)}…\` and receipts to the chain._` }],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      log(FN, "error", "Slack approval post failed", { status: response.status });
      return { ok: false, error: `Slack error ${response.status}` };
    }
    log(FN, "info", "approval requested", { who, commandId });
    return { ok: true };
  } catch (err) {
    log(FN, "error", "Slack approval post failed", { error: String(err) });
    return { ok: false, error: String(err) };
  }
}

export async function postToSlack(params: PostToSlackParams): Promise<PostToSlackResult> {
  const { channel, who, what, proof, ask, title, alert = false } = params;

  // The contract, enforced at runtime — a caller that forgets proof is a bug we
  // want loud, not a post that quietly asserts something unverified.
  if (!proof?.trim()) {
    log(FN, "error", "refused: post without proof", { channel, who });
    return { ok: false, error: "proof is required — no post without proof" };
  }
  if (!who?.trim() || !what?.trim()) {
    return { ok: false, error: "who and what are required" };
  }

  const envVar = WEBHOOK_ENV[channel];
  const url = Deno.env.get(envVar);
  if (!url) {
    log(FN, "error", `${envVar} not configured`);
    return { ok: false, error: `Slack not configured for #${channel}` };
  }

  const lines: string[] = [];
  if (title) lines.push(`*${alert ? ":rotating_light: " : ""}${title}*`);
  else if (alert) lines.push("*:rotating_light: ALERT*");
  lines.push(`*WHO* ${who}`, `*WHAT* ${what}`, `*PROOF* ${proof}`);
  if (ask) lines.push(`*ASK* ${ask}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });

    if (!response.ok) {
      const body = await response.text();
      // Never log `url` — it is the credential.
      log(FN, "error", "Slack webhook error", { channel, status: response.status, body });
      return { ok: false, error: `Slack error ${response.status}` };
    }

    log(FN, "info", "posted to Slack", { channel, who });
    return { ok: true };
  } catch (err) {
    log(FN, "error", "Slack post failed", { channel, error: String(err) });
    return { ok: false, error: String(err) };
  }
}
