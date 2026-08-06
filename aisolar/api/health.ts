/**
 * /api/health — deployment health check for uptime monitors (#52).
 *
 * The SPA rewrite in vercel.json deliberately excludes this path
 * ("/((?!api/health).*)"), so Vercel serves THIS function instead of index.html.
 * A 200 here means the deployment is live and serving. Point an uptime monitor
 * (or a status page) at https://<domain>/api/health.
 *
 * Floor only — it does not yet ping Supabase/Stripe/Postmark. A deeper check
 * (dependency probes) is a sensible follow-up once monitoring is wired.
 */
export const config = { runtime: "edge" };

export default function handler(): Response {
  return new Response(
    JSON.stringify({ status: "ok", ts: new Date().toISOString() }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}
