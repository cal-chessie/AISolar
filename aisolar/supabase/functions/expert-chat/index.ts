/**
 * expert-chat — Landing-page AI chatbot.
 *
 * Phase 1 fixes:
 *   - Auth: accepts anon Supabase JWT OR service-role key. No more wildcards.
 *   - Rate limit: 10 requests per IP per hour, tracked in-memory per instance.
 *     (Supabase Edge Functions are stateless across instances, so this is a
 *     best-effort guard. For production-grade limiting, switch to Upstash
 *     Redis or Supabase's built-in rate limiter.)
 *   - CORS: tightened to the same allowed-origins list used by all other
 *     functions (no more Access-Control-Allow-Origin: "*").
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, log } from "../_shared/auth.ts";

const FN = "expert-chat";

// In-memory per-IP rate limit. Resets every hour. Per-instance, not global.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10; // 10 requests per IP per hour
const ipHits = new Map<string, { count: number; windowStart: number }>();

function rateLimit(ip: string): { ok: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetInMs: RATE_LIMIT_WINDOW_MS };
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0, resetInMs: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
  }
  return {
    ok: true,
    remaining: RATE_LIMIT_MAX - entry.count,
    resetInMs: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart),
  };
}

function getClientIp(req: Request): string {
  // Prefer X-Forwarded-For (set by Supabase's gateway), fall back to X-Real-IP.
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Verify the caller is either an anon Supabase JWT holder or the service-role key.
 * The landing-page chat is open to anyone with a valid Supabase anon JWT
 * (issued to anonymous visitors via supabase.auth.signInAnonymously() if
 * enabled, OR to logged-in users). This prevents pure unauthenticated abuse.
 */
async function verifyCaller(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);

  // Service-role key shortcut
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;

  // Verify the JWT against Supabase auth
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return false;
  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Auth
    const ok = await verifyCaller(req);
    if (!ok) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Rate limit
    const ip = getClientIp(req);
    const rl = rateLimit(ip);
    if (!rl.ok) {
      log(FN, "warn", "Rate limit exceeded", { ip });
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          content: "I'm getting a lot of questions right now! Please try again in a few minutes, or upload your bill for instant analysis.",
          retryAfterSeconds: Math.ceil(rl.resetInMs / 1000),
        }),
        {
          status: 429,
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rl.resetInMs / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    const { message, messages: existingMessages, context } = body;
    const AI_API_KEY = Deno.env.get("AI_API_KEY") ?? Deno.env.get("OPENROUTER_API_KEY");

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Build messages array - support both single message and array format
    const chatMessages = existingMessages && Array.isArray(existingMessages)
      ? existingMessages
      : message
        ? [{ role: "user", content: message }]
        : [];

    if (chatMessages.length === 0) {
      return new Response(
        JSON.stringify({ content: "Hello! I'm your solar energy expert. Ask me anything about solar panels, savings, or grants in Ireland!" }),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Cap conversation history to last 10 messages to control cost
    const trimmedMessages = chatMessages.slice(-10);

    // Add system prompt for solar expertise
    const systemPrompt = {
      role: "system",
      content: `You are a friendly Irish solar energy expert for AISOLAR. You help homeowners understand solar panel benefits, SEAI grants (€2,100 for systems ≥4kWp), electricity savings, and payback periods. Keep responses concise (2-3 sentences) and encouraging. Always mention that uploading their bill gives personalized savings estimates.${context ? ` Context: ${JSON.stringify(context)}` : ''}`
    };

    const allMessages = [systemPrompt, ...trimmedMessages];

    log(FN, "info", "Chat request", { ip, msgCount: trimmedMessages.length });

    // AI provider — OpenAI-compatible endpoint, tenant-configurable.
    // Was hardwired to Lovable's gateway; AISolar is BYO-key per tenant
    // (see the vault: "BYO keys stay with the owner/tenant"), so this reads
    // the tenant's own provider + key and falls back to OpenRouter.
    const AI_BASE_URL = Deno.env.get("AI_BASE_URL") ?? "https://openrouter.ai/api/v1";
    const AI_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "google/gemini-2.5-flash";
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: allMessages,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(FN, "error", "AI gateway error", { status: response.status, body: errorText });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", content: "I'm getting a lot of questions right now! Please try again in a moment, or upload your bill for instant analysis." }),
          { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I apologize, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log(FN, "error", "Chat error", { msg: error instanceof Error ? error.message : "Unknown" });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        content: "I'm having trouble connecting. Please upload your bill above for a free personalized analysis!"
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
