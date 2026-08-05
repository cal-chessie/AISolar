-- 20260805_notifications_bell.sql
-- Fixes found on the 5 Aug comms audit (add-only, idempotent):
--  1. leadWrites.addTouchpoint inserts tenant_id — the column didn't exist, so
--     every consultant reply on a REAL lead failed to persist. Column added.
--  2. RLS was lead-scoped only: a team_invite bell row (lead_id null) failed
--     own_lead(null), and a user couldn't read rows addressed to THEM unless
--     they could see the lead. Policies now also key on user_id = auth.uid().
alter table public.notifications
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

drop policy if exists notifications_sel on public.notifications;
create policy notifications_sel on public.notifications for select
  using (user_id = auth.uid() or can_see_lead(lead_id));

drop policy if exists notifications_ins on public.notifications;
create policy notifications_ins on public.notifications for insert
  with check (own_lead(lead_id) or (lead_id is null and user_id = auth.uid()));

drop policy if exists notifications_upd on public.notifications;
create policy notifications_upd on public.notifications for update
  using (user_id = auth.uid() or own_lead(lead_id))
  with check (user_id = auth.uid() or own_lead(lead_id));
