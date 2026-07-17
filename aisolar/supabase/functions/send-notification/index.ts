import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
// Sender email - must be a verified sender signature in Postmark
const POSTMARK_SENDER_EMAIL = Deno.env.get("POSTMARK_SENDER_EMAIL") || "notifications@aisolar.ie";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_NAME = "AISOLAR";
const BRAND_EMAIL = POSTMARK_SENDER_EMAIL;

interface EmailRequest {
  type: "invoice_created" | "deposit_paid" | "final_paid" | "installation_scheduled" | "installation_completed" | "stage_change";
  leadId: string;
  invoiceId?: string;
  installationDate?: string;
  previousStage?: string;
  newStage?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, leadId, invoiceId, installationDate, previousStage, newStage }: EmailRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error("Lead not found");
    }

    // Fetch invoice if provided
    let invoice = null;
    if (invoiceId) {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();
      invoice = data;
    }

    let subject = "";
    let html = "";
    const portalUrl = lead.access_token 
      ? `${req.headers.get("origin")}/customer/${lead.access_token}`
      : null;

    switch (type) {
      case "invoice_created":
        subject = `Your Solar Installation Invoice - ${invoice?.invoice_number || ""}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${BRAND_NAME}</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb;">
              <h2 style="color: #111827; margin-top: 0;">Hi ${lead.name},</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Thank you for choosing ${BRAND_NAME}! Your invoice has been generated and is ready for review.
              </p>
              <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #111827;">Invoice Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice?.invoice_number || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">€${(invoice?.total_amount || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Deposit (30%):</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">€${(invoice?.deposit_amount || 0).toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              ${portalUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  View Invoice & Pay Deposit
                </a>
              </div>
              ` : ""}
              <p style="color: #6b7280; font-size: 14px;">
                If you have any questions, please don't hesitate to contact us.
              </p>
            </div>
            <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. SEAI Registered | RECI Certified.</p>
            </div>
          </div>
        `;
        break;

      case "deposit_paid":
        subject = "Deposit Received - Thank You! ☀️";
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${BRAND_NAME}</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb;">
              <h2 style="color: #111827; margin-top: 0;">Great news, ${lead.name}!</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                We've received your deposit payment of <strong>€${(invoice?.deposit_amount || 0).toLocaleString()}</strong>. 
                Your solar installation is now confirmed!
              </p>
              <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                <h3 style="margin: 0; color: #065f46;">Payment Confirmed</h3>
                <p style="color: #047857; margin: 8px 0 0 0;">Invoice #${invoice?.invoice_number || "N/A"}</p>
              </div>
              <h3 style="color: #111827;">What's Next?</h3>
              <ol style="color: #4b5563; line-height: 1.8;">
                <li>Select your preferred installation date in your customer portal</li>
                <li>Our team will confirm your installation slot</li>
                <li>We'll contact you 48 hours before installation</li>
                <li>Final payment due upon completion</li>
              </ol>
              ${portalUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Choose Installation Date
                </a>
              </div>
              ` : ""}
            </div>
            <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. SEAI Registered | RECI Certified.</p>
            </div>
          </div>
        `;
        break;

      case "final_paid":
        subject = "Payment Complete - Thank You! 🎉";
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${BRAND_NAME}</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb;">
              <h2 style="color: #111827; margin-top: 0;">Thank you, ${lead.name}! 🎉</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Your final payment has been received and your invoice is now <strong>paid in full</strong>.
              </p>
              <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                <h3 style="margin: 0; color: #065f46;">Fully Paid</h3>
                <p style="color: #047857; margin: 8px 0 0 0;">Total: €${(invoice?.total_amount || 0).toLocaleString()}</p>
              </div>
              <p style="color: #4b5563; line-height: 1.6;">
                We'll send your SEAI grant documentation and warranty certificates shortly. 
                Welcome to clean, renewable energy!
              </p>
            </div>
            <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. SEAI Registered | RECI Certified.</p>
            </div>
          </div>
        `;
        break;

      case "installation_scheduled":
        const formattedDate = installationDate 
          ? new Date(installationDate).toLocaleDateString("en-IE", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })
          : "To be confirmed";
        subject = `Installation Scheduled - ${formattedDate}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${BRAND_NAME}</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb;">
              <h2 style="color: #111827; margin-top: 0;">Installation Confirmed!</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Hi ${lead.name}, your solar installation has been scheduled.
              </p>
              <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">📅</div>
                <h3 style="margin: 0; color: #111827;">${formattedDate}</h3>
                <p style="color: #6b7280; margin: 8px 0 0 0;">${lead.address || "Address on file"}</p>
              </div>
              <h3 style="color: #111827;">Preparation Checklist</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Ensure clear access to your roof</li>
                <li>Clear any obstacles from driveway for our van</li>
                <li>Someone 18+ must be present during installation</li>
                <li>Ensure attic access is clear</li>
              </ul>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                Our team will arrive between 8:00 AM and 9:00 AM. Installation typically takes 1-2 days depending on system size.
              </p>
            </div>
            <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. SEAI Registered | RECI Certified.</p>
            </div>
          </div>
        `;
        break;

      case "installation_completed":
        subject = "Installation Complete - Final Payment Due 🎉";
        const paymentUrl = portalUrl ? `${portalUrl}#payment` : null;
        const finalPaymentAmount = invoice?.final_amount || (invoice?.total_amount ? invoice.total_amount - (invoice.deposit_amount || 0) : 0);
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${BRAND_NAME}</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb;">
              <h2 style="color: #111827; margin-top: 0;">Congratulations, ${lead.name}! 🎉</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Your solar installation has been <strong>successfully completed</strong>! Your system is now generating clean, renewable energy.
              </p>
              <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">☀️</div>
                <h3 style="margin: 0; color: #065f46;">Installation Complete!</h3>
                <p style="color: #047857; margin: 8px 0 0 0;">Your system is now live and generating power</p>
              </div>
              
              <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #111827;">Final Payment Due</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice?.invoice_number || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Total Project Cost:</td>
                    <td style="padding: 8px 0; text-align: right;">€${(invoice?.total_amount || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Deposit Paid:</td>
                    <td style="padding: 8px 0; text-align: right; color: #10b981;">-€${(invoice?.deposit_amount || 0).toLocaleString()}</td>
                  </tr>
                  <tr style="border-top: 2px solid #e5e7eb;">
                    <td style="padding: 12px 0 8px 0; color: #111827; font-weight: 600;">Balance Due:</td>
                    <td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 20px; color: #10b981;">€${finalPaymentAmount.toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              ${paymentUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${paymentUrl}" style="display: inline-block; background: #10b981; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Pay Final Balance Now
                </a>
              </div>
              ` : ""}
              
              <h3 style="color: #111827;">What's Next?</h3>
              <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                <li>Complete your final payment to receive all documentation</li>
                <li>We'll submit your SEAI grant application</li>
                <li>Receive your warranty certificates and system documentation</li>
                <li>Start enjoying free solar energy!</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                If you have any questions about your new solar system, please don't hesitate to contact us.
              </p>
            </div>
            <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. SEAI Registered | RECI Certified.</p>
            </div>
          </div>
        `;
        break;

      case "stage_change":
        const stageLabels: Record<string, string> = {
          new: 'New Lead',
          contacted: 'Contacted',
          survey: 'Survey Scheduled',
          proposal: 'Proposal Sent',
          approved: 'Proposal Approved',
          scheduled: 'Installation Scheduled',
          installed: 'Installation Complete',
          completed: 'Project Completed',
        };
        const prevLabel = stageLabels[previousStage || 'new'] || previousStage;
        const newLabel = stageLabels[newStage || 'new'] || newStage;
        
        subject = `Project Update: ${newLabel}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${BRAND_NAME}</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb;">
              <h2 style="color: #111827; margin-top: 0;">Hi ${lead.name},</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Great news! Your solar project has progressed to a new stage.
              </p>
              <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
                  <div style="text-align: center; padding: 12px 20px; background: #f3f4f6; border-radius: 8px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Previous</div>
                    <div style="font-weight: 600; color: #374151;">${prevLabel}</div>
                  </div>
                  <div style="font-size: 24px;">→</div>
                  <div style="text-align: center; padding: 12px 20px; background: #ecfdf5; border-radius: 8px; border: 2px solid #10b981;">
                    <div style="font-size: 12px; color: #059669; margin-bottom: 4px;">Current</div>
                    <div style="font-weight: 600; color: #065f46;">${newLabel}</div>
                  </div>
                </div>
              </div>
              ${portalUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  View Your Project
                </a>
              </div>
              ` : ""}
              <p style="color: #6b7280; font-size: 14px;">
                If you have any questions about your project status, please contact us.
              </p>
            </div>
            <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. SEAI Registered | RECI Certified.</p>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    console.log(`Sending ${type} email to ${lead.email} via Postmark`);

    // Send via Postmark API
    const postmarkResponse = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN || "",
      },
      body: JSON.stringify({
        From: `${BRAND_NAME} <${BRAND_EMAIL}>`,
        To: lead.email,
        Subject: subject,
        HtmlBody: html,
        MessageStream: "outbound",
      }),
    });

    const postmarkData = await postmarkResponse.json();

    if (!postmarkResponse.ok) {
      console.error("Postmark error:", postmarkData);
      throw new Error(postmarkData.Message || "Failed to send email");
    }

    console.log("Email sent successfully via Postmark:", postmarkData.MessageID);

    return new Response(JSON.stringify({ success: true, messageId: postmarkData.MessageID }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
