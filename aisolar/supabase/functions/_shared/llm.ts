/**
 * llm.ts — Shared OpenRouter client for all edge functions.
 *
 * Phase 4: makes the "AI-OS" pitch true. Previously, agent-drain made ZERO
 * LLM calls — all 10 handlers were deterministic JS. Now any handler can
 * call `callLLM()` to get a real LLM response from OpenRouter.
 *
 * Features:
 *   - Reads API key + default model + daily cost cap from `ai_config` table
 *   - Records cost_usd / model / prompt_tokens / completion_tokens on the
 *     provided agent_runs row
 *   - Pre-flight daily cap check (skips LLM if daily spend exceeded)
 *   - Pricing map for common OpenRouter models (USD per 1M tokens)
 *   - Graceful fallback: if LLM call fails, returns null so the handler can
 *     use deterministic logic instead
 *
 * Usage:
 *   import { callLLM } from "../_shared/llm.ts";
 *   const result = await callLLM({
 *     supabase,
 *     runId,
 *     agentId: 'proposal_drafter',
 *     systemPrompt: 'You are...',
 *     userPrompt: 'Lead: ...',
 *     model: 'google/gemini-2.5-flash',  // optional — overrides default
 *   });
 *   if (result?.content) { /* use it *\/ }
 *   else { /* fall back to deterministic logic *\/ }
 */

import { log } from "./auth.ts";

const FN = "llm";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Pricing per 1M tokens (input, output) in USD. Source: openrouter.ai/models
 * Updated July 2026. If a model isn't listed, we estimate $1/1M for both. */
const PRICING: Record<string, { input: number; output: number }> = {
  // Google
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
  "google/gemini-2.0-flash": { input: 0.10, output: 0.40 },
  // OpenAI
  "openai/gpt-4o": { input: 2.50, output: 10.00 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.60 },
  "openai/gpt-4-turbo": { input: 10.00, output: 30.00 },
  // Anthropic
  "anthropic/claude-3.5-sonnet": { input: 3.00, output: 15.00 },
  "anthropic/claude-3.5-haiku": { input: 0.80, output: 4.00 },
  "anthropic/claude-3-opus": { input: 15.00, output: 75.00 },
  // Meta
  "meta-llama/llama-3.1-70b-instruct": { input: 0.35, output: 0.40 },
  "meta-llama/llama-3.1-8b-instruct": { input: 0.05, output: 0.08 },
  // Mistral
  "mistralai/mistral-large": { input: 2.00, output: 6.00 },
  "mistralai/mistral-small": { input: 0.20, output: 0.60 },
};

function computeCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model] ?? { input: 1.0, output: 1.0 };
  return (
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output
  );
}

interface AIConfig {
  apiKey: string;
  defaultModel: string;
  dailyCapUsd: number;
  enabled: boolean;
}

async function loadAIConfig(supabase: any): Promise<AIConfig> {
  const { data, error } = await supabase
    .from("ai_config")
    .select("key, value")
    .in("key", ["openrouter_api_key", "openrouter_default_model", "daily_cost_cap_usd", "enable_llm_calls"]);

  if (error || !data) {
    return {
      apiKey: Deno.env.get("OPENROUTER_API_KEY") ?? "",
      defaultModel: "google/gemini-2.5-flash",
      dailyCapUsd: 5.0,
      enabled: true,
    };
  }

  const cfg: Record<string, string> = {};
  for (const row of data) cfg[row.key] = row.value;

  return {
    apiKey: cfg.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY") || "",
    defaultModel: cfg.openrouter_default_model || "google/gemini-2.5-flash",
    dailyCapUsd: parseFloat(cfg.daily_cost_cap_usd || "5.00"),
    enabled: cfg.enable_llm_calls !== "false",
  };
}

/** Sum of cost_usd for agent_runs in the last 24h. */
async function getDailySpend(supabase: any): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("agent_runs")
    .select("cost_usd")
    .gte("created_at", since)
    .not("cost_usd", "is", null);

  if (error || !data) return 0;
  return data.reduce((sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 0);
}

export interface LLMCallParams {
  supabase: any;
  /** agent_runs.id — cost + tokens will be recorded on this row */
  runId?: string;
  agentId: string;
  systemPrompt: string;
  userPrompt: string;
  /** Override the default model from ai_config */
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCallResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  /** True if the call was skipped (cap exceeded, disabled, or no API key) */
  skipped: boolean;
  skipReason?: string;
}

/**
 * Call OpenRouter with the given prompts. Records cost on the agent_runs row.
 * Returns null if LLM is disabled, cap is exceeded, or the call fails —
 * the caller should fall back to deterministic logic in that case.
 */
export async function callLLM(params: LLMCallParams): Promise<LLMCallResult | null> {
  const { supabase, runId, agentId, systemPrompt, userPrompt, model, maxTokens = 800, temperature = 0.4 } = params;

  const cfg = await loadAIConfig(supabase);

  // Skip if disabled
  if (!cfg.enabled) {
    log(FN, "info", "LLM disabled — skipping", { agentId });
    return null;
  }

  // Skip if no API key
  if (!cfg.apiKey) {
    log(FN, "warn", "No OpenRouter API key — skipping LLM", { agentId });
    return null;
  }

  // Pre-flight daily cap check
  const spent = await getDailySpend(supabase);
  if (spent >= cfg.dailyCapUsd) {
    log(FN, "warn", "Daily cost cap exceeded — skipping LLM", { agentId, spent, cap: cfg.dailyCapUsd });
    return null;
  }

  const useModel = model || cfg.defaultModel;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  log(FN, "info", "Calling OpenRouter", { agentId, model: useModel, promptLen: userPrompt.length });

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aisolar.ie",
        "X-Title": "AISOLAR Agent",
      },
      body: JSON.stringify({
        model: useModel,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });
  } catch (err) {
    log(FN, "error", "OpenRouter fetch failed", { agentId, error: err instanceof Error ? err.message : "Unknown" });
    return null;
  }

  if (!response.ok) {
    const errText = await response.text();
    log(FN, "error", "OpenRouter API error", { agentId, status: response.status, body: errText.slice(0, 500) });
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const usage = data.usage || {};
  const promptTokens = Number(usage.prompt_tokens) || 0;
  const completionTokens = Number(usage.completion_tokens) || 0;
  const costUsd = computeCostUsd(useModel, promptTokens, completionTokens);

  log(FN, "info", "OpenRouter call succeeded", { agentId, model: useModel, promptTokens, completionTokens, costUsd });

  // Record cost on the agent_runs row
  if (runId) {
    await supabase.from("agent_runs").update({
      model: useModel,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost_usd: Number(costUsd.toFixed(6)),
    }).eq("id", runId);
  }

  return {
    content,
    model: useModel,
    promptTokens,
    completionTokens,
    costUsd,
    skipped: false,
  };
}

/**
 * Load the active prompt for an agent from the agent_prompts table.
 * Returns null if no active prompt exists for this agent.
 */
export async function getActivePrompt(supabase: any, agentId: string): Promise<{
  systemPrompt: string;
  userPromptTemplate: string;
  model: string | null;
} | null> {
  const { data, error } = await supabase
    .from("agent_prompts")
    .select("system_prompt, user_prompt_template, model")
    .eq("agent_id", agentId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    systemPrompt: data.system_prompt,
    userPromptTemplate: data.user_prompt_template,
    model: data.model,
  };
}

/**
 * Fill a prompt template with the given variables.
 * Template uses {variable_name} placeholders.
 */
export function fillTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val === undefined || val === null ? `{${key}}` : String(val);
  });
}
