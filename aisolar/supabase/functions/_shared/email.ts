/**
 * email.ts — Shared Postmark email sender.
 *
 * Phase 4: extracted from send-payment-reminder/index.ts so that agent-drain's
 * handlePostInstall can send warranty emails without duplicating the Postmark
 * integration.
 *
 * Usage:
 *   import { sendEmail } from "../_shared/email.ts";
 *   const result = await sendEmail({
 *     to: "customer@example.com",
 *     subject: "Your warranty docs",
 *     htmlBody: "<h1>...</h1>",
 *   });
 *   if (result.ok) { /* sent — MessageID = result.messageId *\/ }
 */

import { log } from "./auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FN = "email";

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";

/**
 * Is this address on the global suppression list (hard bounce / spam complaint)?
 * Fail-OPEN: if we can't check (no env / DB error) we return false and let the
 * send proceed — blocking all mail on a DB hiccup is worse than an occasional
 * re-send. A definite hit always suppresses. See migration email_suppressions.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !email) return false;
    const sb = createClient(url, key);
    const { data } = await sb
      .from("email_suppressions")
      .select("email")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  /** Optional reply-to address */
  replyTo?: string;
  /** Optional Postmark message stream (default: "outbound") */
  messageStream?: string;
}

interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  /** True when the send was skipped because the address is suppressed. */
  suppressed?: boolean;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, htmlBody, replyTo, messageStream = "outbound" } = params;

  const serverToken = Deno.env.get("POSTMARK_SERVER_TOKEN");
  const senderEmail = Deno.env.get("POSTMARK_SENDER_EMAIL") || "notifications@aisolar.ie";
  const brandName = "AISOLAR";

  if (!serverToken) {
    log(FN, "error", "POSTMARK_SERVER_TOKEN not configured");
    return { ok: false, error: "Postmark not configured" };
  }

  // Reputation guard: never mail a hard-bounced / complaining address again.
  if (await isEmailSuppressed(to)) {
    log(FN, "info", "Email suppressed (bounce/complaint) — not sending", { to });
    return { ok: false, suppressed: true, error: "suppressed" };
  }

  try {
    const response = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": serverToken,
      },
      body: JSON.stringify({
        From: `${brandName} <${senderEmail}>`,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: messageStream,
        // Native unsubscribe UI in Gmail/Outlook — diverts would-be spam
        // complaints to an unsubscribe instead (helps domain reputation).
        Headers: [
          { Name: "List-Unsubscribe", Value: `<mailto:${senderEmail}?subject=unsubscribe>` },
        ],
        ...(replyTo ? { ReplyTo: replyTo } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      log(FN, "error", "Postmark API error", { status: response.status, body: data });
      return { ok: false, error: data.Message || `Postmark error ${response.status}` };
    }

    log(FN, "info", "Email sent", { to, subject, messageId: data.MessageID });
    return { ok: true, messageId: data.MessageID };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log(FN, "error", "Postmark fetch failed", { error: msg });
    return { ok: false, error: msg };
  }
}

/**
 * Build a branded HTML email wrapper around the given body content.
 * Use this so all emails have the same header (gradient + brand name) and
 * footer (SEAI Registered · RECI Certified).
 */
export function wrapEmailHtml(bodyHtml: string): string {
  const brandName = "AISOLAR";
  const year = new Date().getFullYear();
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">☀️ ${brandName}</h1>
  </div>
  <div style="padding: 32px; background: #f9fafb;">
    ${bodyHtml}
  </div>
  <div style="padding: 24px; text-align: center; background: #111827; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">© ${year} ${brandName}. SEAI Registered | RECI Certified.</p>
  </div>
</div>
`;
}

/** Build the warranty + review request email body for handlePostInstall. */
export function buildWarrantyEmailHtml(customerName: string, systemSizeKw: number, panelModel: string, inverterModel: string, hasBattery: boolean, reviewUrl: string, portalUrl?: string | null): string {
  return `
    <h2 style="color: #111827; margin-top: 0;">Your solar system is live! 🎉</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      Hi ${customerName}, your ${systemSizeKw}kWp solar system was commissioned today and is now generating clean energy. Thank you for choosing AISOLAR!
    </p>
    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="font-size: 48px; margin-bottom: 12px; text-align: center;">☀️</div>
      <h3 style="margin: 0; color: #065f46; text-align: center;">Installation Complete</h3>
      <p style="color: #047857; margin: 8px 0 0 0; text-align: center;">Your system is now live and generating power</p>
    </div>
    <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #111827;">Your warranty coverage</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280;">Workmanship:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">10 years</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Panels (${panelModel}):</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">25 years (performance)</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Inverter (${inverterModel}):</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">10 years</td></tr>
        ${hasBattery ? `<tr><td style="padding: 8px 0; color: #6b7280;">Battery:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">10 years</td></tr>` : ""}
      </table>
    </div>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <h3 style="margin: 0 0 8px 0; color: #92400e;">⭐ Leave us a review</h3>
      <p style="color: #78350f; margin: 0 0 16px 0;">If you're happy with your install, please leave us a Google review — it helps us reach more Irish homeowners.</p>
      <a href="${reviewUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Leave a review</a>
    </div>
    ${portalUrl ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${portalUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View your project portal</a>
    </div>
    ` : ""}
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      If you have any questions about your new solar system, please don't hesitate to contact us.
    </p>
  `;
}
