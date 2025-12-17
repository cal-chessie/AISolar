import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const POSTMARK_SENDER_EMAIL = Deno.env.get("POSTMARK_SENDER_EMAIL") || "notifications@aisolar.ie";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_NAME = "AISOLAR";

// Default thresholds per stage
const DEFAULT_THRESHOLDS: Record<string, number> = {
  'new': 2,
  'survey': 3,
  'proposal': 5,
  'approved': 3,
  'scheduled': 7,
  'installed': 14
};

interface StaleLead {
  id: string;
  name: string;
  email: string;
  workflow_stage: string | null;
  updated_at: string;
  days_stale: number;
  threshold: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Follow-up digest function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch stage thresholds from settings
    const { data: thresholdSettings } = await supabase
      .from("follow_up_settings")
      .select("workflow_stage, threshold_days");

    const thresholds: Record<string, number> = { ...DEFAULT_THRESHOLDS };
    (thresholdSettings || []).forEach((t: { workflow_stage: string; threshold_days: number }) => {
      thresholds[t.workflow_stage] = t.threshold_days;
    });

    // Fetch all leads that aren't completed
    const { data: allLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, email, workflow_stage, updated_at")
      .not("workflow_stage", "in", '("completed","installed","done")');

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      throw leadsError;
    }

    // Filter leads that exceed their stage-specific threshold
    const now = new Date();
    const staleLeads: StaleLead[] = (allLeads || [])
      .map(lead => {
        const stage = lead.workflow_stage || 'new';
        const threshold = thresholds[stage] || 3;
        const daysSinceUpdate = Math.floor(
          (now.getTime() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...lead,
          days_stale: daysSinceUpdate,
          threshold
        };
      })
      .filter(lead => lead.days_stale >= lead.threshold)
      .sort((a, b) => (b.days_stale - b.threshold) - (a.days_stale - a.threshold));

    if (staleLeads.length === 0) {
      console.log("No stale leads found");
      return new Response(
        JSON.stringify({ message: "No stale leads to report" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${staleLeads.length} stale leads`);

    // Fetch all consultants to send digest
    const { data: consultants, error: consultantsError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("role", "consultant");

    if (consultantsError) {
      console.error("Error fetching consultants:", consultantsError);
      throw consultantsError;
    }

    // Get consultant emails from auth
    const consultantEmails: string[] = [];
    for (const consultant of consultants || []) {
      const { data: userData } = await supabase.auth.admin.getUserById(consultant.user_id);
      if (userData?.user?.email) {
        consultantEmails.push(userData.user.email);
      }
    }

    if (consultantEmails.length === 0) {
      console.log("No consultant emails found");
      return new Response(
        JSON.stringify({ message: "No consultants to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate email HTML - categorize by overdue severity
    const urgentLeads = staleLeads.filter(l => (l.days_stale - l.threshold) >= 4);
    const warningLeads = staleLeads.filter(l => (l.days_stale - l.threshold) >= 2 && (l.days_stale - l.threshold) < 4);
    const attentionLeads = staleLeads.filter(l => (l.days_stale - l.threshold) < 2);

    const getStageLabel = (stage: string | null) => {
      const labels: Record<string, string> = {
        'new': 'New Lead',
        'survey': 'Survey',
        'proposal': 'Proposal',
        'approved': 'Approved',
        'scheduled': 'Scheduled'
      };
      return labels[stage || 'new'] || stage || 'New Lead';
    };

    const generateLeadRow = (lead: StaleLead) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${lead.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${getStageLabel(lead.workflow_stage)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${(lead.days_stale - lead.threshold) >= 4 ? '#dc2626' : (lead.days_stale - lead.threshold) >= 2 ? '#f59e0b' : '#6b7280'}; font-weight: bold;">
          ${lead.days_stale}d / ${lead.threshold}d
        </td>
      </tr>
    `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; }
          .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px; }
          .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; margin-top: 16px; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
          .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📋 Follow-up Reminder Digest</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">You have ${staleLeads.length} leads needing attention</p>
          </div>
          
          <div class="content">
            ${urgentLeads.length > 0 ? `
              <div class="alert">
                <strong>🚨 Urgent:</strong> ${urgentLeads.length} lead${urgentLeads.length > 1 ? 's' : ''} significantly overdue
              </div>
            ` : ''}
            
            ${warningLeads.length > 0 ? `
              <div class="warning">
                <strong>⚠️ Warning:</strong> ${warningLeads.length} lead${warningLeads.length > 1 ? 's' : ''} overdue for follow-up
              </div>
            ` : ''}
            
            <table>
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Stage</th>
                  <th>Days / Threshold</th>
                </tr>
              </thead>
              <tbody>
                ${staleLeads.slice(0, 15).map(generateLeadRow).join('')}
              </tbody>
            </table>
            
            ${staleLeads.length > 15 ? `
              <p style="text-align: center; color: #6b7280; margin-top: 16px;">
                + ${staleLeads.length - 15} more leads...
              </p>
            ` : ''}
            
            <p style="text-align: center; margin-top: 24px;">
              <a href="${Deno.env.get("SITE_URL") || "https://aisolar.ie"}/consultant" 
                 style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Open Dashboard
              </a>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated follow-up reminder from ${BRAND_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Postmark
    const postmarkResponse = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN || "",
      },
      body: JSON.stringify({
        From: `${BRAND_NAME} <${POSTMARK_SENDER_EMAIL}>`,
        To: consultantEmails.join(","),
        Subject: `📋 Follow-up Reminder: ${staleLeads.length} leads need attention`,
        HtmlBody: emailHtml,
        MessageStream: "outbound",
      }),
    });

    const postmarkData = await postmarkResponse.json();

    if (!postmarkResponse.ok) {
      console.error("Postmark error:", postmarkData);
      throw new Error(postmarkData.Message || "Failed to send email");
    }

    console.log("Email sent successfully:", postmarkData.MessageID);

    return new Response(
      JSON.stringify({ 
        success: true, 
        staleLeadsCount: staleLeads.length,
        emailsSent: consultantEmails.length,
        messageId: postmarkData.MessageID
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-follow-up-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
