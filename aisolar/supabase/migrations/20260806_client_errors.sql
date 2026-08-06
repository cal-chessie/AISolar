-- 20260806_client_errors — observability floor: "see it crash" (#16).
--
-- WHY: the app has per-route ErrorBoundaries but they only console.error — after
-- deploy there's nowhere to SEE what's breaking for real users. This is a
-- dependency-free crash sink (no Sentry account needed): the client reports render
-- crashes + unhandled errors/rejections here; platform admins read it.
--
-- Sentry is the richer upgrade (stack grouping, source maps, alerting) — add later
-- with Cal's DSN. This is the floor that works day one.

create table if not exists public.client_errors (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  message     text not null,
  source      text,          -- 'error-boundary' | 'window.onerror' | 'unhandledrejection'
  stack       text,
  path        text,          -- location.pathname, TOKEN-MASKED by the client (never the raw /customer/<token>)
  user_agent  text,
  tenant_id   uuid,          -- best-effort (may be null for the anon portal)
  -- bound the payload so an insert-only anon endpoint can't be used to dump data
  constraint client_errors_bounds check (
    length(message) <= 2000
    and length(coalesce(stack, '')) <= 8000
    and length(coalesce(path, '')) <= 300
    and length(coalesce(user_agent, '')) <= 400
  )
);

create index if not exists idx_client_errors_occurred on public.client_errors(occurred_at desc);

alter table public.client_errors enable row level security;

-- Anyone (incl. anon/portal via the anon key) may INSERT a crash report; only
-- platform admins may read (ops via dashboard / service role). No update/delete.
drop policy if exists client_errors_insert on public.client_errors;
create policy client_errors_insert on public.client_errors
  for insert to anon, authenticated with check (true);

drop policy if exists client_errors_admin_read on public.client_errors;
create policy client_errors_admin_read on public.client_errors
  for select using (public.is_platform_admin(auth.uid()));
