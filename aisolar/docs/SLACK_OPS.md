# SLACK OPS — the coordination nervous system (28 Jul 2026)

> The ops layer for the WHOLE build (all repos + agents + vault), not just
> AISolar — it lives here because this is where the active work and the
> accountability spine (FINAL_PUSH.md) already sit.
>
> Why it exists: scattered markdown as a *source of truth* drifts. Proof, this
> session: the conductor notes still pointed at a stale resume point
> (`ConsultantCockpitV5 / cowork-jul21`) when the real build was AIField on
> `cowork-jul25`. A past session edited a file; a later agent would have trusted
> it over the actual repo. Slack fixes the *coordination* rot. Git/Supabase stay
> the truth.

## The one rule that makes this world-class instead of a new pile
- **Slack is the nervous system, NOT the brain.**
- Canonical truth: **code = git · data = Supabase · spec = the durable docs.**
  Agents verify against those (against disk, never against a Slack summary).
- Slack = the live flow + an append-only audit trail + human-in-the-loop.
  It is a *deliberately bad* place to store canonical state — that is the point:
  it forces truth to stay in git/DB where it can't be silently rewritten.
- **One channel = one purpose.** That is what keeps agents on task. Nothing
  load-bearing ever lives ONLY in a chat scroll.

## The workspace — leanest setup (decided)
- **ONE free Slack workspace**, dedicated to the build. Name doesn't matter —
  e.g. "AIOS Ops". Cal = owner; agents join as a bot app (below). No human team
  needed yet.
- **Free tier is the right call.** Its only real limit is 90-day message
  history — and that does not matter, because the truth lives in git (unlimited,
  versioned). Do not pay until volume or retention actually demands it.
- Everything durable gets **pinned** (pins survive; scroll does not) or lives in
  git. Slack holds the live flow, not the archive.

## Channels — START WITH 3 (truly minimal)
| Channel | Purpose | Who posts | Cal's action |
|---|---|---|---|
| **#build** | Active work feed — one thread per work item. What's starting, what landed (with commit SHA + `ls-remote` proof). Takes over NOTES.md's *running* role. | Claude + agents | Read; reply to steer |
| **#decisions** | Your calls + approvals, append-only. Agent posts a proposed action → you react. This is FINAL_PUSH's spine, made live. | Claude + agents | ✅ / ❌ — **nothing ships without your ✅** |
| **#monitoring** | Health, errors, deploy status now; client incidents post-launch. **Green = silence.** Red = a threaded alert with context + suggested fix + a link to ground truth. | Monitoring crons | Glance; act on red only |

## Channels — GROW TO 5 (only when a channel earns it)
| Channel | Split out when… |
|---|---|
| **#approvals** | the approval queue starts crowding the decision log — pull it into its own lane. |
| **#learning** | the self-learning loop goes live. The "Wrong" corrections that today die in a toast land here with context; a weekly cron posts *"what the agents learned / where they're corrected most."* Your **#1 Sweep-8 moat**, made visible. |

## How agents hook in — 3 mechanisms, added in this order
1. **Incoming webhooks — day one, for the always-on agents.**
   One webhook URL per channel. Any agent (a Hermes cron, a Claude scheduled
   task, a Supabase edge function) POSTs JSON → it appears in the channel. No
   login dance per message. This is how the monitoring + learning agents post,
   and it fits the crons you already run. Keep posts **event-driven /
   thresholded** (green = silence) — respects Slack's rate limits AND your
   OpenRouter credit cap.
2. **Slack MCP connector — for me, when I'm working.**
   One OAuth sign-in in an *interactive* Claude session and I can read, post,
   react, and thread live. This is how I drive coordination. **Cannot be done
   from a background session** (that's why I couldn't switch it on today).
3. **Claude-in-Slack app — phase 2, triggering from your phone.**
   The `/install-slack-app` flow puts the Claude app in the workspace so you can
   **@Claude** in a channel to kick off work from anywhere. Add once the flow
   above is proven — don't front-load it.

## The message contract (so posts stay signal, not noise)
Every agent post carries four things, or it doesn't post:
- **WHO** — the agent name.
- **WHAT** — one line.
- **PROOF** — commit SHA / `ls-remote` / row count / URL. Truth-pass applies in
  Slack exactly like in the code: no "sent / live / done" without the link.
- **ASK** — the decision, if it needs your yes.

Status updates **thread under the work item** — they never spawn new top-level
messages. Monitoring posts only on state-change or threshold breach.

## Setup — the exact steps (you do these in an interactive session, ~10 min)
I can't run these from this background session (the sign-in needs an interactive
Claude session). Order:
1. **Create the workspace** — slack.com → Create a Workspace → free plan.
2. **Create 3 channels** — `#build`, `#decisions`, `#monitoring`.
3. **Pin the anchors** — FINAL_PUSH.md spine → pin in `#decisions`;
   AIFIELD_BUILD_PLAN.md → pin in `#build`.
4. **Incoming webhooks** — Slack → Tools & settings → Manage apps → build an
   internal app → enable Incoming Webhooks → add one per channel → save the 3
   URLs in your **secret store, NOT git** (same discipline as the Supabase
   keys — a webhook URL is a key).
5. **Slack MCP** — in an interactive Claude Code terminal, add the Slack
   connector and sign in. Then tell me and I'll verify I can post + wire the
   channels.
6. **(Phase 2)** `/install-slack-app` for `@Claude` triggering.

## Migration — moving coordination in without recreating the scatter
- **Do NOT bulk-dump the 19 docs.** That's infinite scroll instead of files.
- **Pins = anchors, flow = live work.**
- **NOTES.md** — its *running* role moves to `#build`; its *canonical spec* role
  stays in git.
- **FINAL_PUSH.md** — the spine gets pinned in `#decisions`; the live ticks
  become ✅ reactions.
- The docs stay in git as the spec; Slack **references** them, never replaces.

## Guardrails — what this does NOT change
- **Nothing auto-sends.** Agents draft/propose; you ✅. Your standing rule, now
  enforced by the surface itself.
- **Secrets never in Slack or git** — webhook URLs + keys live in the secret
  store. GATE 0 discipline applies here too.
- **Slack is not the archive** — git is. The free-tier 90-day cap is fine
  *because* of that.

## Post-launch — the always-on layer (the reason you asked)
- **Monitoring cron(s):** watch the agent-drain queue, edge-function errors,
  payment webhooks, extract-bill failures, uptime → `#monitoring`, green =
  silence, red = threaded alert.
- **Learning cron:** aggregate the "Wrong" corrections weekly → `#learning`
  owner report → feeds prompt/rule tuning (the self-healing part), cross-tenant
  via the kernel, no PII.
- Both are scheduled agents posting via webhook — realistic, cheap, and exactly
  the *"always hooked in"* you described. This is the surface that makes the
  learning loop (already your top Sweep-8 moat) visible instead of invisible.

---
*Truth in git. Flow in Slack. One purpose per channel. Nothing ships without a ✅.*
