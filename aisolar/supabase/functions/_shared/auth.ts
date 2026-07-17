// Shared helpers for Supabase Edge Functions
// PII-safe logging, JWT-aware auth, consistent CORS

/** Allowed origins (configurable via ALLOWED_ORIGINS env var). */
export function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  if (!raw) {
    // Default: same-origin only (Vercel preview deploys)
    return ["https://aisolar.ie", "https://www.aisolar.ie"];
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-access-token, x-cc-webhook-signature, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/** PII-safe logger. Redacts known-sensitive keys. */
const PII_KEYS = new Set([
  "email", "phone", "access_token", "imageBase64", "customer_email",
  "customerEmail", "lead_email", "stripe_customer_id", "password",
  "newPassword", "resetEmail", "token", "signature_data",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (typeof value === "string") {
    // Mask email-like strings
    if (value.includes("@") && value.length > 3) {
      const [local, domain] = value.split("@");
      return `${local[0]}***@${domain ?? "***"}`;
    }
    // Mask long strings that look like tokens/JWTs
    if (value.length > 40 && /^[A-Za-z0-9._-]+$/.test(value)) {
      return value.slice(0, 8) + "...REDACTED";
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_KEYS.has(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function log(fn: string, level: "info" | "warn" | "error", msg: string, fields?: Record<string, unknown>): void {
  const payload = {
    fn,
    level,
    msg,
    ts: new Date().toISOString(),
    ...(fields ? { fields: redact(fields) } : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logStep(fn: string, step: string, fields?: Record<string, unknown>): void {
  log(fn, "info", step, fields);
}

/** Extract the caller's user from the Authorization header.
 * Returns null if not authenticated.
 */
export async function getCaller(req: Request): Promise<{ id: string; email?: string; role?: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  // Use Supabase auth.getUser() to verify the JWT
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return null;

  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

/** Require the caller to have one of the given roles.
 * Returns the user if authorized, throws HTTP 403 response if not.
 */
export async function requireRole(req: Request, allowedRoles: string[]): Promise<{ id: string; email?: string }> {
  const user = await getCaller(req);
  if (!user) {
    throw new HttpError(401, "Authentication required");
  }

  // Fetch user roles from DB
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new HttpError(500, "Server not configured");
  }

  const resp = await fetch(`${supabaseUrl}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`, {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
  });
  if (!resp.ok) {
    throw new HttpError(500, "Could not verify role");
  }
  const roles: Array<{ role: string }> = await resp.json();
  const hasRole = roles.some((r) => allowedRoles.includes(r.role));
  if (!hasRole) {
    throw new HttpError(403, `Requires one of: ${allowedRoles.join(", ")}`);
  }
  return user;
}

/** Allow caller to be EITHER an authenticated staff user OR a customer with a valid access token.
 * Used by customer-facing functions (send-notification, send-proposal-accepted, etc.).
 */
export async function getCallerOrToken(req: Request): Promise<
  | { type: "staff"; user: { id: string; email?: string } }
  | { type: "customer"; token: string }
  | null
> {
  const user = await getCaller(req);
  if (user) return { type: "staff", user };

  const accessToken = req.headers.get("x-access-token");
  if (accessToken && accessToken.length === 64) {
    return { type: "customer", token: accessToken };
  }

  return null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/** Convert any thrown error to an HTTP response. */
export function errorResponse(err: unknown, headers: Record<string, string>): Response {
  if (err instanceof HttpError) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: err.status, headers: { "Content-Type": "application/json", ...headers } }
    );
  }
  const msg = err instanceof Error ? err.message : "Unknown error";
  return new Response(
    JSON.stringify({ error: msg }),
    { status: 500, headers: { "Content-Type": "application/json", ...headers } }
  );
}
