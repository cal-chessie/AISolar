

## Plan: Customer Dashboard with Authenticated Login

### What exists now
- `/portal` (ClientPortal): Email-lookup only, no auth. Finds leads by email, redirects to `/customer/:token`.
- `/customer/:token`: Public token-based portal for viewing a single project.
- `/auth`: Staff login (owner/consultant/installer roles). No customer role.

### What to build

**1. Database: Add `customer` to app_role enum and create RLS policies**
- Add `'customer'` value to the `app_role` enum
- Update `handle_new_user()` to support customer signups
- Add RLS policy on `leads` for customers to SELECT their own leads (matched by email)
- Add RLS policy on `proposals` for customers to SELECT proposals linked to their leads
- Add RLS policy on `invoices` for customers to SELECT invoices linked to their leads
- Add RLS policy on `contracts` for customers to SELECT contracts linked to their leads

**2. Auth page: Add customer signup/login option**
- Add `'customer'` to `RoleType` in `Auth.tsx`
- Add a "Customer" option in the role selector on signup
- On login, if user has only `customer` role, redirect to `/my-projects`

**3. New page: `src/pages/CustomerDashboard.tsx` at route `/my-projects`**
- Auth-gated: redirect to `/auth` if not logged in
- Fetch leads where `email` matches logged-in user's email
- For each lead, fetch latest proposal, invoice, and contract
- Display:
  - Header with user greeting and logout button
  - Project cards showing: name, address, workflow stage badge, system size, net cost
  - Click a project card → expand inline or navigate to detail view with tabs (Overview, Proposal, Payment, SEAI Grant)
  - Detail view reuses existing components: `StatusTimeline`, `ProposalSummaryCard`, `InvoiceCard`, `SEAIGrantStatus`

**4. Route registration in `App.tsx`**
- Add `/my-projects` route pointing to `CustomerDashboard`

**5. Navigation updates**
- Add "Customer Login" or "My Projects" link in `SiteNavigation.tsx`
- Update `ClientPortal.tsx` to show a "Sign in for full access" link to `/auth`

### Technical details

**Migration SQL:**
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- Customers can view leads matching their email
CREATE POLICY "Customers can view own leads"
ON public.leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role)
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Customers can view proposals for their leads
CREATE POLICY "Customers can view own proposals"
ON public.proposals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role)
  AND lead_id IN (SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Similar for invoices, contracts
```

**CustomerDashboard.tsx structure:**
- Uses `useAuth()` hook for session
- Queries `leads` by user email → fetches related proposals/invoices/contracts
- Two views: project list (default) and project detail (selected project)
- Project detail reuses `StatusTimeline`, `ProposalSummaryCard`, `InvoiceCard`, `SEAIGrantStatus`
- Realtime subscriptions for invoice/proposal updates

**Files changed:**
- `supabase/migrations/` — new migration for enum + RLS
- `src/pages/CustomerDashboard.tsx` — new file
- `src/pages/Auth.tsx` — add customer role option + redirect
- `src/App.tsx` — add route
- `src/hooks/useAuth.ts` — add 'customer' to AppRole type
- `src/components/layout/SiteNavigation.tsx` — add nav link
- `src/pages/ClientPortal.tsx` — add sign-in prompt link

