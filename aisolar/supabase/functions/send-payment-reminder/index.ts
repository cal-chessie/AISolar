import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { requireRole } from "../_shared/auth.ts";

const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const POSTMARK_SENDER_EMAIL = Deno.env.get("POSTMARK_SENDER_EMAIL") || "notifications@aisolar.ie";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_NAME = "AISOLAR";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authz (P0-6): service-role key (pg_cron) OR admin/consultant JWT only.
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const isServiceKey = !!serviceKey && authHeader === `Bearer ${serviceKey}`;
  if (!isServiceKey) {
    try {
      await requireRole(req, ["admin", "consultant"]);
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status || 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  console.log("[PAYMENT-REMINDER] Starting payment reminder check");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find invoices where:
    // - Installation is completed (deposit_paid = true)
    // - Final payment is NOT received
    // - Updated more than 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: unpaidInvoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        lead_id,
        total_amount,
        deposit_amount,
        final_amount,
        created_at,
        updated_at
      `)
      .eq("final_paid", false)
      .eq("deposit_paid", true)
      .lt("updated_at", sevenDaysAgo.toISOString());

    if (invoicesError) {
      console.error("[PAYMENT-REMINDER] Error fetching invoices:", invoicesError);
      throw invoicesError;
    }

    console.log(`[PAYMENT-REMINDER] Found ${unpaidInvoices?.length || 0} unpaid invoices older than 7 days`);

    const results = [];

    for (const invoice of unpaidInvoices || []) {
      // Get lead details
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("name, email, access_token")
        .eq("id", invoice.lead_id)
        .single();

      if (leadError || !lead) {
        console.error(`[PAYMENT-REMINDER] Lead not found for invoice ${invoice.id}`);
        continue;
      }

      const finalAmount = invoice.final_amount || (invoice.total_amount - (invoice.deposit_amount || 0));
      const portalUrl = lead.access_token 
        ? `${req.headers.get("origin") || "https://aisolar.ie"}/customer/${lead.access_token}#payment`
        : null;

      const daysSinceInstallation = Math.floor(
        (Date.now() - new Date(invoice.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${BRAND_NAME}</h1>
          </div>
          <div style="padding: 32px; background: #f9fafb;">
            <h2 style="color: #111827; margin-top: 0;">Hi ${lead.name},</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              We hope you're enjoying your new solar system! This is a friendly reminder that your final payment is still outstanding.
            </p>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 24px;">⚠️</span>
                <h3 style="margin: 0; color: #92400e;">Payment Reminder</h3>
              </div>
              <p style="color: #78350f; margin: 0;">
                Your installation was completed ${daysSinceInstallation} days ago. Please complete your final payment to receive your warranty certificates and SEAI grant documentation.
              </p>
            </div>

            <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h3 style="margin-top: 0; color: #111827;">Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Total Project Cost:</td>
                  <td style="padding: 8px 0; text-align: right;">€${invoice.total_amount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Deposit Paid:</td>
                  <td style="padding: 8px 0; text-align: right; color: #10b981;">-€${(invoice.deposit_amount || 0).toLocaleString()}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 12px 0 8px 0; color: #111827; font-weight: 600;">Balance Due:</td>
                  <td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 20px; color: #dc2626;">€${finalAmount.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            ${portalUrl ? `
            <div style="text-align: center; margin: 32px 0;">
              <a href="${portalUrl}" style="display: inline-block; background: #10b981; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Pay Now
              </a>
            </div>
            ` : ""}
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              If you have any questions or concerns about your payment, please don't hesitate to contact us.
            </p>
          </div>
          <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. SEAI Registered | RECI Certified.</p>
          </div>
        </div>
      `;

      try {
        const postmarkResponse = await fetch(POSTMARK_API_URL, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN || "",
          },
          body: JSON.stringify({
            From: `${BRAND_NAME} <${POSTMARK_SENDER_EMAIL}>`,
            To: lead.email,
            Subject: `Payment Reminder - €${finalAmount.toLocaleString()} Balance Due`,
            HtmlBody: html,
            MessageStream: "outbound",
          }),
        });

        const postmarkData = await postmarkResponse.json();

        if (!postmarkResponse.ok) {
          console.error(`[PAYMENT-REMINDER] Postmark error for ${lead.email}:`, postmarkData);
          results.push({ invoice_id: invoice.id, success: false, error: postmarkData.Message });
        } else {
          console.log(`[PAYMENT-REMINDER] Reminder sent to ${lead.email} for invoice ${invoice.invoice_number}`);
          results.push({ invoice_id: invoice.id, success: true, email: lead.email, messageId: postmarkData.MessageID });
        }
      } catch (emailError: any) {
        console.error(`[PAYMENT-REMINDER] Email error:`, emailError);
        results.push({ invoice_id: invoice.id, success: false, error: emailError.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      reminders_sent: results.filter(r => r.success).length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[PAYMENT-REMINDER] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
