# AISOLAR — Auth & User Gates Runbook
> Everything that governs "who can log in and see what," and the exact steps to
> avoid the day-one lockout. Read before first live signup. Verified against
> code 2026-07-18.

## The model (three layers — don't confuse them)
1. **Supabase Auth** — identity (email + password, email confirmation, reset).
2. **Roles** — `public.user_roles(user_id, role)`, role ∈ admin | consultant |
   installer | customer. A user can hold several (owner = admin+consultant+installer).
3. **Two enforcement points:**
   - **RLS on the database** = the REAL security boundary. Every table is
     row-level-locked (see 20260719_rls_lockdown + 20260723_role_management).
   - **ProtectedRoute (client)** = UX guard only. Stops a logged-in customer
     from seeing staff *screens*; it does NOT protect data. Never rely on it
     for security — RLS does that.

## The day-one wall (FIXED 2026-07-18, but you must run the bootstrap)
Everyone who signs up is assigned **customer** by the `handle_new_user` trigger.
This is deliberate: trusting the signup role picker would let anyone self-assign
admin. Consequence: **the very first staff account cannot exist without one
manual step.** After you (Cal) sign up at `/auth`:

Run once in the AISOLAR Supabase SQL editor (project coxmtpnq…):
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, r FROM auth.users, unnest(ARRAY['admin','consultant','installer']::app_role[]) r
WHERE email = 'cal@renewably.ie'
ON CONFLICT DO NOTHING;
```
Now you're owner. From then on you grant everyone else **inside the app** (no
more SQL) via the `grant_role` RPC:
```ts
await supabase.rpc('grant_role', { p_target_email: 'consultant@firm.ie', p_role: 'consultant' })
```
Only an admin can call it; it's guarded server-side and by RLS.

## Supabase dashboard settings to set BEFORE launch (not in code)
1. **Auth → Providers → Email:** confirm "Confirm email" is ON (signup flow
   already expects it — users are told to check their inbox).
2. **Auth → URL Configuration:** set Site URL + Redirect URLs to the real
   Vercel domain(s). Currently signup uses `window.location.origin` — fine, but
   the allow-list must include prod, or confirm/reset links break.
3. **Auth → SMTP:** Supabase's built-in email is rate-limited and not for
   production. Wire your Postmark (or similar) SMTP so confirm/reset emails
   actually arrive at volume.
4. **Auth → Providers → "Leaked password protection":** turn ON (flagged in the
   original AUDIT_REPORT as user-action).
5. Confirm **`VITE_ENABLE_DEMO` is NOT set** in Vercel prod env. Demo mode
   bypasses auth; it's gated to DEV builds but the env var would re-open it.

## Role → landing page (what each user sees)
- customer → `/my-projects` (portal: their project + chat + GDPR rights only)
- installer only → `/installer` (jobs, materials, map)
- consultant / owner → `/consultant` (full pipeline) ; owner also `/owner` cockpit
- Customer portal also supports **token access** (no login) via `x-access-token`
  header matched against `leads.access_token` — that's how a homeowner opens
  their portal from an email link without an account. RLS enforces the match.

## What's solid (don't regress)
- RLS lockdown migration closed the P0 leaks (leads, contracts, invoices,
  profiles, surveys, seai docs) — data is role/ownership scoped.
- Edge functions require the right role via `requireRole()` (agent-drain admin-
  gated; ingest-lead uses the shared INGEST_API_KEY, not user auth).
- has_role() is SECURITY DEFINER → policies use it to avoid RLS recursion.

## Small follow-ups (not blockers)
- `/auth` role picker is cosmetic (trigger ignores it). Reframe as "Requested
  role — activated after approval" or hide it for customer self-signup. Design pass.
- Consider a tiny admin "Team" screen that lists profiles and calls grant_role,
  so you never touch SQL after the bootstrap.
