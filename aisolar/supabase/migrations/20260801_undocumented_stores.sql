-- 20260801_undocumented_stores.sql — the CODE-SCRAPE migration (Cal, 30 Jul: "did you
-- go through every single part of the app or just the sweep docs?"). Answer: the docs
-- missed four stores built before documentation started. A full grep of src/ found every
-- client store; this migration gives the uncovered ones their server home.
-- Add-only · idempotent · RLS via public.has_role().

-- ── 1. PRODUCTS (M8, finally schema'd) — replaces FOUR localStorage keys:
--       aisolar_custom_products / _product_overrides / _product_images / _by_model.
--       One row per product; overrides + images as jsonb; files → lead-documents-style
--       storage later (image dataURLs migrate to bucket paths at cutover).
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid,
  kind        text not null check (kind in ('panel','inverter','battery','other')),
  make        text not null,
  model       text not null,
  specs       jsonb not null default '{}'::jsonb,   -- watts/kwh/AC kW/dims/warranty/type-test ref
  overrides   jsonb not null default '{}'::jsonb,   -- tenant-level price/blurb overrides
  images      jsonb not null default '[]'::jsonb,   -- [{path|dataUrl, label}] — bucket paths at cutover
  is_custom   boolean not null default false,       -- true = tenant-added (was aisolar_custom_products)
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, make, model)
);
comment on table public.products is 'The unified catalog (SWEEP8 M8) — server home for the four product localStorage keys found by the 30 Jul code scrape.';

-- ── 2. CONSENT RECORDS (A6) — GDPR audit trail; replaces aisolar_consent_v1.
--       Ties to anonymise_lead(): consent is a record, not a browser flag.
create table if not exists public.consent_records (
  id           uuid primary key default gen_random_uuid(),
  subject_ref  text not null,                        -- lead id / user id / email hash — never raw PII beyond need
  consent_key  text not null default 'aisolar_consent_v1',
  choices      jsonb not null default '{}'::jsonb,   -- {essential:true, analytics:false, ...}
  granted      boolean not null,
  captured_at  timestamptz not null default now(),
  source       text                                  -- page/banner version
);
create index if not exists consent_subject_idx on public.consent_records(subject_ref);
comment on table public.consent_records is 'GDPR consent audit trail (A6). Append-only by convention: a change of mind is a NEW row, never an update.';

-- ── 3. FEEDBACK (the never-documented store) — replaces aisolar_feedback.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid,
  author_ref  uuid,                                  -- auth.users id
  context     text,                                  -- surface it was left on
  body        text not null,
  created_at  timestamptz not null default now()
);
comment on table public.feedback is 'Owner-cockpit feedback store — existed in localStorage (aisolar_feedback), never documented; surfaced by the 30 Jul code scrape.';

-- ── 4. THE CENTRALISED CONVERSATION (29 Jul build — in-memory today, dies on refresh).
--       One thread per lead shared by consultant + installer + coach.
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (lead_id)
);
create table if not exists public.conversation_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_role      text not null check (sender_role in ('consultant','installer','customer','agent','coach','system')),
  sender_ref       uuid,                             -- auth.users id where applicable
  body             text not null,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists conv_msgs_conv_idx on public.conversation_messages(conversation_id, created_at);
comment on table public.conversation_messages is 'ONE record per lead conversation — the unified consultant+installer inbox (29 Jul). Sends remain draft-gated; a message row is not a send.';

-- ── updated_at + RLS ─────────────────────────────────────────────────────────
do $$ begin
  create trigger trg_products_updated before update on public.products
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.products              enable row level security;
alter table public.consent_records       enable row level security;
alter table public.feedback              enable row level security;
alter table public.conversations         enable row level security;
alter table public.conversation_messages enable row level security;

do $$ begin
  create policy products_staff on public.products for all
    using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'))
    with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy consent_admin on public.consent_records for all
    using (public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy feedback_staff on public.feedback for all
    using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant'))
    with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy conversations_staff on public.conversations for all
    using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy conv_messages_staff on public.conversation_messages for all
    using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'))
    with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'));
exception when duplicate_object then null; end $$;

-- ── 5. LEAD TOUCHPOINTS (found re-reading the sweep notes, 30 Jul: "in-memory
--       record today. Sweep 8: persist touchpoints + Supabase Realtime").
create table if not exists public.lead_touchpoints (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  kind        text not null,                           -- call/email/visit/portal_view/note…
  summary     text,
  actor_role  text,
  actor_ref   uuid,
  occurred_at timestamptz not null default now()
);
create index if not exists touchpoints_lead_idx on public.lead_touchpoints(lead_id, occurred_at);
alter table public.lead_touchpoints enable row level security;
do $$ begin
  create policy touchpoints_staff on public.lead_touchpoints for all
    using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'))
    with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'));
exception when duplicate_object then null; end $$;

-- NOT migrated (pure client state, correct as-is): aisolar_demo_mode (must be OFF in
-- prod — A10) · aisolar_shell_collapsed · recentSearches. Supabase SDK auth storage is
-- the SDK's own. Store inventory closed: 13 localStorage stores (5 previously covered,
-- 4 covered here, 3 client-only, 1 SDK) + 2 in-memory (conversations, touchpoints) — both now schema'd.
