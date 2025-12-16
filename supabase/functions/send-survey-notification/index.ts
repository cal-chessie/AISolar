import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SurveyNotificationRequest {
  customerName: string;
  customerEmail: string;
  surveyDate: string;
  surveyTime?: string;
  consultantName?: string;
  consultantPhone?: string;
  consultantEmail?: string;
  propertyAddress?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerName,
      customerEmail,
      surveyDate,
      surveyTime,
      consultantName,
      consultantPhone,
      consultantEmail,
      propertyAddress,
    }: SurveyNotificationRequest = await req.json();

    if (!customerEmail || !customerName || !surveyDate) {
      throw new Error("Missing required fields: customerEmail, customerName, surveyDate");
    }

    const formattedDate = new Date(surveyDate).toLocaleDateString('en-IE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailResponse = await resend.emails.send({
      from: "AI Solar <notifications@resend.dev>",
      to: [customerEmail],
      subject: `Your Solar Survey is Scheduled - ${formattedDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); padding: 12px 24px; border-radius: 12px;">
              <span style="color: white; font-size: 24px; font-weight: bold;">☀️ AI Solar</span>
            </div>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">
              Hi ${customerName}! 👋
            </h1>
            <p style="margin: 0; color: #475569; font-size: 16px;">
              Great news! Your solar site survey has been scheduled.
            </p>
          </div>

          <div style="background: #10b981; color: white; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px;">📅 Survey Details</h2>
            <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 16px;">
              <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
              ${surveyTime ? `<p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${surveyTime}</p>` : ''}
              ${propertyAddress ? `<p style="margin: 0;"><strong>Location:</strong> ${propertyAddress}</p>` : ''}
            </div>
          </div>

          ${consultantName ? `
          <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b;">👤 Your Consultant</h2>
            <p style="margin: 0 0 8px 0; color: #475569;"><strong>${consultantName}</strong></p>
            ${consultantPhone ? `<p style="margin: 0 0 8px 0; color: #475569;">📞 <a href="tel:${consultantPhone}" style="color: #10b981;">${consultantPhone}</a></p>` : ''}
            ${consultantEmail ? `<p style="margin: 0; color: #475569;">✉️ <a href="mailto:${consultantEmail}" style="color: #10b981;">${consultantEmail}</a></p>` : ''}
          </div>
          ` : ''}

          <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">📋 What to Expect</h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li style="margin-bottom: 8px;">The survey takes approximately 30-45 minutes</li>
              <li style="margin-bottom: 8px;">We'll assess your roof, electrical setup, and energy needs</li>
              <li style="margin-bottom: 8px;">Please ensure access to your attic and fuse board</li>
              <li style="margin-bottom: 0;">Have a recent electricity bill handy if possible</li>
            </ul>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <p style="color: #64748b; font-size: 14px;">
              Need to reschedule? Contact us at least 24 hours before your appointment.
            </p>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} AI Solar Ireland. All rights reserved.<br>
              SEAI Registered • RECI Certified • Fully Insured
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Survey notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-survey-notification function:", error);
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
