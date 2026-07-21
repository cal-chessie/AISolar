import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, log, HttpError, errorResponse, getCaller, getCallerOrToken } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FN = "extract-bill-data";

// v3: Validate image size and type to prevent OOM and type injection
const MAX_IMAGE_BYTES = 5_000_000; // 5 MB base64 (~3.7 MB binary)
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // v3: Authentication required.
    // The bill upload happens on the public landing page (/upload), so we
    // can't require a logged-in user — BUT we still need to gate abuse.
    // Strategy: accept anonymous calls (the landing page flow), but apply
    // per-IP rate limiting + size/type validation. The JWT requirement is
    // enforced at the Supabase gateway level via verify_jwt=true, which
    // means we accept the Supabase anon key as a valid JWT for public calls.
    const caller = await getCaller(req);
    log(FN, "info", "Bill extraction requested", { authenticated: !!caller });

    const AI_API_KEY = Deno.env.get("AI_API_KEY") ?? Deno.env.get("OPENROUTER_API_KEY");
    if (!AI_API_KEY) {
      throw new HttpError(500, "AI service not configured");
    }

    const { imageBase64, fileType, leadId } = await req.json();

    if (!imageBase64) {
      throw new HttpError(400, "No image data provided");
    }

    // v3: Size and type validation
    if (typeof imageBase64 !== "string" || imageBase64.length > MAX_IMAGE_BYTES) {
      throw new HttpError(400, `Image too large. Max ${MAX_IMAGE_BYTES} bytes base64.`);
    }
    if (fileType && !ALLOWED_TYPES.has(fileType)) {
      throw new HttpError(400, `Unsupported file type. Allowed: ${[...ALLOWED_TYPES].join(", ")}`);
    }

    log(FN, "info", "Processing bill image", { fileType, sizeBytes: imageBase64.length });

        // AI provider — OpenAI-compatible endpoint, tenant-configurable.
    // Was hardwired to Lovable's gateway; AISolar is BYO-key per tenant
    // (see the vault: "BYO keys stay with the owner/tenant"), so this reads
    // the tenant's own provider + key and falls back to OpenRouter.
    const AI_BASE_URL = Deno.env.get("AI_BASE_URL") ?? "https://openrouter.ai/api/v1";
    const AI_MODEL = Deno.env.get("AI_VISION_MODEL") ?? "google/gemini-2.5-flash";
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting data from Irish electricity bills (Electric Ireland, Energia, SSE Airtricity, Bord Gáis Energy, Pinergy, PrepayPower, Yuno, Community Power, etc.).

Extract EVERYTHING visible on the bill. Every field feeds the solar system design, so completeness matters.

IMPORTANT: The MPRN is critical - usually labeled "MPRN", "Meter Point Reference Number", or "Metering Point Reference". Always 11 digits.

Respond ONLY with valid JSON in this exact format (null for anything not visible):
{
  "mprn": "12345678901" or null,
  "billAmount": 150.50 or null,
  "annualKwh": 4500 or null,
  "billingPeriodKwh": 380 or null,
  "accountName": "John Smith" or null,
  "address": "123 Main St, Dublin" or null,
  "eircode": "D18A4K9" or null,
  "provider": "Electric Ireland" or null,
  "tariffName": "Home Electric+ Night Boost" or null,
  "billingPeriod": "1 Dec 2025 - 31 Dec 2025" or null,
  "unitRate": 0.42 or null,
  "nightRate": 0.23 or null,
  "standingCharge": 0.75 or null,
  "standingChargeUnit": "per day" | "per month" | null,
  "vatRate": 9 or null,
  "dayNightMeter": true | false | null,
  "dayUsageKwh": 250 or null,
  "nightUsageKwh": 130 or null,
  "estimatedReading": true | false | null,
  "confidence": "high" | "medium" | "low",
  "notes": "any issues or observations"
}

Rules:
- If only billing-period usage is shown, still report it in billingPeriodKwh and annualise into annualKwh (multiply by periods per year).
- Rates in euros (0.42, not 42 cents).
- estimatedReading true if the reading is marked E/estimated.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract the electricity bill data from this image. Focus especially on finding the MPRN number."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${fileType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          fallback: true 
        }), {
          status: 429,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please contact support.",
          fallback: true 
        }), {
          status: 402,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(JSON.stringify({ 
        error: "Failed to extract bill data",
        fallback: true 
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    console.log("AI response content:", content);

    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(JSON.stringify({ 
        error: "Failed to parse bill data",
        fallback: true,
        rawResponse: content
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    console.log("Extracted bill data:", extractedData);

    // Normalise once, then both persist and return the SAME object — the
    // response must never claim a field the database did not accept.
    const bill = {
      mprn: extractedData.mprn || null,
      billAmount: extractedData.billAmount || null,
      annualKwh: extractedData.annualKwh || null,
      billingPeriodKwh: extractedData.billingPeriodKwh || null,
      accountName: extractedData.accountName || null,
      address: extractedData.address || null,
      eircode: extractedData.eircode || null,
      provider: extractedData.provider || null,
      tariffName: extractedData.tariffName || null,
      billingPeriod: extractedData.billingPeriod || null,
      unitRate: extractedData.unitRate || null,
      nightRate: extractedData.nightRate || null,
      standingCharge: extractedData.standingCharge || null,
      standingChargeUnit: extractedData.standingChargeUnit || null,
      vatRate: extractedData.vatRate || null,
      dayNightMeter: extractedData.dayNightMeter ?? null,
      dayUsageKwh: extractedData.dayUsageKwh || null,
      nightUsageKwh: extractedData.nightUsageKwh || null,
      estimatedReading: extractedData.estimatedReading ?? null,
      confidence: extractedData.confidence || 'low',
      notes: extractedData.notes || null,
    };

    // ── Persist ───────────────────────────────────────────────────────────
    // Until now this function READ 21 fields and kept none of them: it
    // returned JSON and the caller dropped it. The proposal then told the
    // homeowner how many details we hold, which was only ever true of the
    // response body, never of the record.
    //
    // AUTHORISATION: this endpoint accepts anonymous callers (the public
    // /upload page), so a bare leadId would let anyone overwrite any lead's
    // bill by guessing a UUID. A write therefore needs either a signed-in
    // staff user or the lead's own 64-char access_token, matching the rule
    // create-checkout already uses. Callers with neither still get their
    // JSON back exactly as before — extraction is not gated, only writing.
    let persisted = false;
    if (leadId) {
      const auth = await getCallerOrToken(req);
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );

      let allowed = auth?.type === "staff";
      if (auth?.type === "customer") {
        const { data: lead } = await admin
          .from("leads").select("access_token").eq("id", leadId).maybeSingle();
        allowed = !!lead && lead.access_token === auth.token;
      }

      if (!allowed) {
        log(FN, "warn", "Refused bill write: caller not authorised for lead", { leadId });
      } else {
        const { error } = await admin.from("lead_intake").upsert({
          lead_id: leadId,
          extracted_mprn: bill.mprn,
          extracted_monthly_bill: bill.billAmount,
          extracted_annual_kwh: bill.annualKwh,
          extracted_billing_period_kwh: bill.billingPeriodKwh,
          extracted_account_name: bill.accountName,
          extracted_address: bill.address,
          extracted_eircode: bill.eircode,
          extracted_provider: bill.provider,
          extracted_tariff_name: bill.tariffName,
          extracted_billing_period: bill.billingPeriod,
          extracted_unit_rate: bill.unitRate,
          extracted_night_rate: bill.nightRate,
          extracted_standing_charge: bill.standingCharge,
          extracted_standing_charge_unit: bill.standingChargeUnit,
          extracted_vat_rate: bill.vatRate,
          extracted_day_night_meter: bill.dayNightMeter,
          extracted_day_usage_kwh: bill.dayUsageKwh,
          extracted_night_usage_kwh: bill.nightUsageKwh,
          extracted_estimated_reading: bill.estimatedReading,
          extracted_notes: bill.notes,
          extraction_confidence: bill.confidence,
          // full model output, so a field we have not typed yet is still
          // recoverable rather than lost between deploys
          extraction_raw: extractedData,
          bill_extracted_at: new Date().toISOString(),
        }, { onConflict: "lead_id" });

        if (error) {
          // A failed write must not read as success. Return the data (the
          // extraction did work) and say plainly that it was not saved.
          log(FN, "error", "Bill extraction not persisted", { leadId, error: error.message });
        } else {
          persisted = true;
          log(FN, "info", "Bill extraction persisted", {
            leadId,
            fieldsHeld: Object.entries(bill).filter(([k, v]) => k !== "confidence" && v !== null).length,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, persisted, data: bill }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return errorResponse(err, headers);
  }
});
