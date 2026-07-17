import { supabase } from "@/integrations/supabase/client";
import { brand } from "@/config/brand";

/**
 * TENANT RESOLUTION — the single module for "whose lead is this?"
 *
 * Two cases, two functions:
 *
 *  1. getTenantId()            — CRM / logged-in staff. Tenant comes from the
 *                                JWT claim stamped by custom_access_token_hook.
 *                                THROWS if missing. No fallback.
 *
 *  2. getPublicTenantContext() — public forms (analyser, free-analysis form),
 *                                anonymous visitors, no session. Tenant comes
 *                                from (in order):
 *                                  a) URL handoff params (?tenant=…&brand=…)
 *                                     — set when a brand site (e.g. Renewable
 *                                     Ireland) opens the analyser in its modal
 *                                  b) this deployment's config/brand
 *
 * THE RULE (from AIOS_ARCHITECTURE Part V):
 *   tenant_id = who has CUSTODY now (the routing agent may transfer it later)
 *   brand     = whose STOREFRONT the lead came through (never changes — fee axis)
 *   source    = which CHANNEL (ai-analyser, website-form, crm-manual, …)
 */

// ---------------------------------------------------------------------------
// Case 1 — CRM (logged-in). Tenant from the JWT claim.
// ---------------------------------------------------------------------------
export async function getTenantId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  if (!jwt) {
    throw new Error("Not signed in — cannot resolve tenant.");
  }

  let tenantId: string | undefined;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    tenantId = payload?.tenant_id;
  } catch {
    /* treated as missing */
  }

  if (!tenantId) {
    throw new Error(
      "No tenant_id in session. The custom_access_token_hook did not stamp it, " +
      "or this user has no tenant in profiles. Refusing to create a record with no owner."
    );
  }
  return tenantId;
}

// ---------------------------------------------------------------------------
// Case 2 — public forms (anonymous). Handoff params win; config is the default.
// ---------------------------------------------------------------------------
export interface PublicTenantContext {
  tenantId: string;
  brand: string;
}

export function getPublicTenantContext(): PublicTenantContext {
  // a) Handoff from a brand site (e.g. Renewable Ireland's modal opens the
  //    analyser with ?tenant=<uuid>&brand=renewable-ireland). The generating
  //    storefront owns the lead — its identity must survive the handoff.
  if (typeof window !== "undefined") {
    const p = new URLSearchParams(window.location.search);
    const urlTenant = p.get("tenant");
    const urlBrand = p.get("brand");
    if (urlTenant && urlBrand) {
      return { tenantId: urlTenant, brand: urlBrand };
    }
  }

  // b) This deployment's own brand config (white-label default).
  if (!brand.tenantId) {
    throw new Error(
      "config/brand is missing tenantId — every deployment must declare which " +
      "tenant holds custody of the leads it generates."
    );
  }
  return { tenantId: brand.tenantId, brand: brand.id };
}
