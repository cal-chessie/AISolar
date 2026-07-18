import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireRole } from "../_shared/auth.ts";

const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const POSTMARK_SENDER_EMAIL = Deno.env.get("POSTMARK_SENDER_EMAIL") || "notifications@aisolar.ie";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_NAME = "AISOLAR";

interface ProposalAcceptedRequest {
  customerName: string;
  customerEmail: string;
  systemSizeKw: number;
  netCost: number;
  seaiGrant: number;
  preferredDates: string[];
  paymentOption: string;
  depositAmount?: number;
  consultantName?: string;
  consultantEmail?: string;
  consultantPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authz (P0-6): service-role key (pg_cron) OR admin/consultant JWT only.
  // This function takes customerEmail in the body — without authz it's an
  // open email relay.
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

  try {
    const {
      customerName,
      customerEmail,
      systemSizeKw,
      netCost,
      seaiGrant,
      preferredDates,
      paymentOption,
      depositAmount,
      consultantName,
      consultantEmail,
      consultantPhone,
    }: ProposalAcceptedRequest = await req.json();

    console.log("Sending proposal accepted email to:", customerEmail);

    const formattedDates = preferredDates
      .map(d => new Date(d).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
      .join(', ');

    const paymentDetails = paymentOption === 'full' 
      ? `Full payment of €${netCost.toLocaleString()} due before installation`
      : paymentOption === 'deposit'
      ? `Deposit: €${depositAmount?.toLocaleString() || Math.round(netCost * 0.3).toLocaleString()} • Balance: €${(netCost - (depositAmount || Math.round(netCost * 0.3))).toLocaleString()} on completion`
      : `Payment plan arranged - details to follow`;

    const consultantSection = consultantName ? `
      <div style="background: #1e293b; color: white; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px 0;">Your Dedicated Consultant</h3>
        <p style="margin: 0 0 16px 0; opacity: 0.8;">Contact me anytime with questions:</p>
        <div style="margin: 8px 0;"><strong>${consultantName}</strong></div>
        ${consultantEmail ? `<div style="margin: 8px 0;">📧 <a href="mailto:${consultantEmail}" style="color: #10b981; text-decoration: none;">${consultantEmail}</a></div>` : ''}
        ${consultantPhone ? `<div style="margin: 8px 0;">📱 <a href="tel:${consultantPhone}" style="color: #10b981; text-decoration: none;">${consultantPhone}</a></div>` : ''}
      </div>
    ` : '';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 28px; font-weight: bold; color: #10b981;">☀️ ${BRAND_NAME}</div>
      <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 16px 0;">✓ Proposal Accepted</div>
      <h1 style="margin: 16px 0; color: #1e293b;">Congratulations, ${customerName}!</h1>
      <p style="color: #64748b; font-size: 18px;">Your solar journey officially begins today.</p>
    </div>

    <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px;">📋 Contract Summary</div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b;">System Size</span>
        <span style="font-weight: 600; color: #1e293b;">${systemSizeKw} kW</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b;">SEAI Grant</span>
        <span style="font-weight: 600; color: #10b981;">-€${seaiGrant.toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b;">Net Cost</span>
        <span style="font-weight: 600; color: #1e293b;">€${netCost.toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0;">
        <span style="color: #64748b;">Payment</span>
        <span style="font-weight: 600; color: #1e293b; font-size: 14px;">${paymentDetails}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px;">📅 Preferred Installation Dates</div>
      <p style="margin: 0; color: #1e293b;">${formattedDates}</p>
      <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">We'll confirm your final installation date within 3 business days.</p>
    </div>

    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px;">🚀 What Happens Next</div>
      <div style="display: flex; align-items: flex-start; margin: 16px 0;">
        <div style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">1</div>
        <div>
          <h4 style="margin: 0 0 4px 0; color: #1e293b;">Payment Processing</h4>
          <p style="margin: 0; color: #64748b; font-size: 14px;">Your deposit/payment will be processed securely.</p>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; margin: 16px 0;">
        <div style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">2</div>
        <div>
          <h4 style="margin: 0 0 4px 0; color: #1e293b;">Installation Confirmation</h4>
          <p style="margin: 0; color: #64748b; font-size: 14px;">We'll confirm your installation date within 3 days.</p>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; margin: 16px 0;">
        <div style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">3</div>
        <div>
          <h4 style="margin: 0 0 4px 0; color: #1e293b;">Pre-Installation Call</h4>
          <p style="margin: 0; color: #64748b; font-size: 14px;">Our team will contact you to finalise details.</p>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; margin: 16px 0;">
        <div style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">4</div>
        <div>
          <h4 style="margin: 0 0 4px 0; color: #1e293b;">SEAI Grant Application</h4>
          <p style="margin: 0; color: #64748b; font-size: 14px;">We'll handle your grant application post-installation.</p>
        </div>
      </div>
    </div>

    ${consultantSection}

    <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
      <p>Thank you for choosing ${BRAND_NAME} for your renewable energy needs.</p>
      <p style="color: #10b981;">RECI Certified • SEAI Registered</p>
    </div>
  </div>
</body>
</html>`;

    const postmarkResponse = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN || "",
      },
      body: JSON.stringify({
        From: `${BRAND_NAME} <${POSTMARK_SENDER_EMAIL}>`,
        To: customerEmail,
        Subject: "🎉 Your Solar Installation is Confirmed - Next Steps",
        HtmlBody: htmlContent,
        MessageStream: "outbound",
      }),
    });

    const postmarkData = await postmarkResponse.json();

    if (!postmarkResponse.ok) {
      console.error("Postmark API error:", postmarkData);
      throw new Error(postmarkData.Message || "Email sending failed");
    }

    console.log("Proposal accepted email sent successfully:", postmarkData.MessageID);

    return new Response(JSON.stringify({ success: true, messageId: postmarkData.MessageID }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-proposal-accepted function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
