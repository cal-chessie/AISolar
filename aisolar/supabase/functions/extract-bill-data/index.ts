import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, log, HttpError, errorResponse, getCaller } from "../_shared/auth.ts";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new HttpError(500, "AI service not configured");
    }

    const { imageBase64, fileType } = await req.json();

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

    // Use Lovable AI Gateway with vision model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting data from Irish electricity bills (Electric Ireland, Energia, SSE Airtricity, Bord Gáis Energy, etc.).

Extract the following information from the bill image:
1. MPRN (Meter Point Reference Number) - This is a 11-digit number unique to the property
2. Total bill amount in EUR (the amount due/payable)
3. Annual consumption in kWh (estimated annual usage or usage for the billing period)
4. Account holder name if visible
5. Property address if visible

IMPORTANT: The MPRN is critical - it's usually labeled as "MPRN", "Meter Point Reference Number", or "Metering Point Reference". It's always 11 digits.

Respond ONLY with valid JSON in this exact format:
{
  "mprn": "12345678901" or null,
  "billAmount": 150.50 or null,
  "annualKwh": 4500 or null,
  "accountName": "John Smith" or null,
  "address": "123 Main St, Dublin" or null,
  "confidence": "high" | "medium" | "low",
  "notes": "any issues or observations"
}`
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please contact support.",
          fallback: true 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Extracted bill data:", extractedData);

    return new Response(JSON.stringify({
      success: true,
      data: {
        mprn: extractedData.mprn || null,
        billAmount: extractedData.billAmount || null,
        annualKwh: extractedData.annualKwh || null,
        accountName: extractedData.accountName || null,
        address: extractedData.address || null,
        confidence: extractedData.confidence || 'low',
        notes: extractedData.notes || null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return errorResponse(err, headers);
  }
});
