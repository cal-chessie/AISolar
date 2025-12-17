import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestUser {
  user_id: string;
  digest_frequency: string;
  digest_time: string;
  last_digest_sent_at: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  lead_id: string | null;
}

const typeLabels: Record<string, string> = {
  contract_signed: "📝 Contracts Signed",
  payment_received: "💰 Payments Received",
  installation_scheduled: "📅 Installations Scheduled",
  survey_completed: "✅ Surveys Completed",
  proposal_approved: "🎉 Proposals Approved",
  stage_change: "📊 Stage Changes",
  deposit_received: "💳 Deposits Received",
  installation_completed: "🔧 Installations Completed",
};

function buildDigestEmail(
  userName: string,
  grouped: Record<string, Notification[]>,
  frequency: string,
  siteUrl: string
): string {
  let sectionsHtml = "";
  
  for (const [type, notifications] of Object.entries(grouped)) {
    const label = typeLabels[type] || type.replace(/_/g, " ");
    sectionsHtml += `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #10b981; font-size: 16px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
          ${label} (${notifications.length})
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${notifications.map(n => `
            <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
              <strong style="color: #374151;">${n.title}</strong>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${n.message}</p>
              <span style="color: #9ca3af; font-size: 12px;">${new Date(n.created_at).toLocaleString()}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  const totalCount = Object.values(grouped).flat().length;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">AISOLAR</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your ${frequency === "weekly" ? "Weekly" : "Daily"} Activity Digest</p>
      </div>
      
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">
          Hi ${userName},<br><br>
          Here's a summary of your activity from the past ${frequency === "weekly" ? "week" : "24 hours"}. 
          You have <strong>${totalCount} notification${totalCount !== 1 ? "s" : ""}</strong> to review.
        </p>
        
        ${sectionsHtml}
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="${siteUrl}/consultant" 
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View Dashboard
          </a>
        </div>
        
        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center;">
          You're receiving this email because you enabled digest notifications in your AISOLAR settings.
          <br>
          <a href="${siteUrl}/settings" style="color: #10b981;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Notification digest function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay();

    console.log(`Running digest check at ${now.toISOString()}, hour: ${currentHour}, day: ${currentDay}`);

    // Get users with digest enabled
    const { data: digestUsers, error: usersError } = await supabase
      .from("notification_preferences")
      .select("user_id, digest_frequency, digest_time, last_digest_sent_at")
      .eq("digest_enabled", true);

    if (usersError) {
      console.error("Error fetching digest users:", usersError);
      throw usersError;
    }

    if (!digestUsers || digestUsers.length === 0) {
      console.log("No users with digest enabled");
      return new Response(JSON.stringify({ message: "No users with digest enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${digestUsers.length} users with digest enabled`);
    const siteUrl = Deno.env.get("SITE_URL") || "https://your-app.lovable.app";
    const results: { userId: string; status: string; error?: string }[] = [];

    for (const user of digestUsers as DigestUser[]) {
      try {
        const digestHour = parseInt(user.digest_time?.split(":")[0] || "9", 10);
        
        if (currentHour !== digestHour) {
          continue;
        }

        if (user.digest_frequency === "weekly" && currentDay !== 1) {
          continue;
        }

        if (user.last_digest_sent_at) {
          const lastSent = new Date(user.last_digest_sent_at);
          const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
          
          if (user.digest_frequency === "daily" && hoursSinceLastSent < 20) continue;
          if (user.digest_frequency === "weekly" && hoursSinceLastSent < 140) continue;
        }

        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.user_id);
        
        if (authError || !authUser?.user?.email) {
          results.push({ userId: user.user_id, status: "error", error: "No email found" });
          continue;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.user_id)
          .single();

        const lookbackHours = user.digest_frequency === "weekly" ? 168 : 24;
        const sinceDate = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000).toISOString();

        const { data: notifications, error: notifError } = await supabase
          .from("notifications")
          .select("id, title, message, type, created_at, lead_id")
          .eq("user_id", user.user_id)
          .gte("created_at", sinceDate)
          .order("created_at", { ascending: false });

        if (notifError) {
          results.push({ userId: user.user_id, status: "error", error: notifError.message });
          continue;
        }

        if (!notifications || notifications.length === 0) {
          results.push({ userId: user.user_id, status: "skipped", error: "No notifications" });
          continue;
        }

        console.log(`Sending digest to ${authUser.user.email} with ${notifications.length} notifications`);

        const grouped = (notifications as Notification[]).reduce((acc, n) => {
          if (!acc[n.type]) acc[n.type] = [];
          acc[n.type].push(n);
          return acc;
        }, {} as Record<string, Notification[]>);

        const emailHtml = buildDigestEmail(
          (profile as any)?.full_name || authUser.user.email.split("@")[0],
          grouped,
          user.digest_frequency,
          siteUrl
        );

        const { error: emailError } = await resend.emails.send({
          from: "AISOLAR <notifications@resend.dev>",
          to: [authUser.user.email],
          subject: `Your ${user.digest_frequency === "weekly" ? "Weekly" : "Daily"} Activity Digest - AISOLAR`,
          html: emailHtml,
        });

        if (emailError) {
          results.push({ userId: user.user_id, status: "error", error: emailError.message });
          continue;
        }

        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", user.user_id);

        results.push({ userId: user.user_id, status: "sent" });
        console.log(`Digest sent successfully to ${authUser.user.email}`);

      } catch (userError: any) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        results.push({ userId: user.user_id, status: "error", error: userError.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-notification-digest:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
