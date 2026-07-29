-- 20260731_network_foundation.sql — THE NETWORK RULING made schema (Cal ratified 30 Jul).
-- The four-layer split: boundary(kernel) · app tenant · BRAND · SOURCE — un-collapsing
-- the four lead dimensions for the 32-county rollout + 100 marketing sites.
-- Add-only · idempotent · RLS via public.has_role(). Deploy with 20260730_esb_submission_pack.

-- ── BRANDS: N marketing identities per app tenant ─────────────────────────────
create table if not exists public.brands (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid,                                   -- app tenant (installer business)
  name         text not null,                          -- "Solar Roscommon" / "Saunderson Solar"
  domain       text,                                   -- primary site domain
  is_licensed  boolean not null default false,         -- true = county/national brand licensed in
  boundary_ref uuid,                                   -- kernel boundary this brand's leads are born to
  theme        jsonb not null default '{}'::jsonb,     -- colors/logo for widget + docs
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (tenant_id, name)
);
comment on table public.brands is 'Marketing identities. N per tenant: licensed county brand + the installer''s own. A brand is a face, never a boundary.';

-- ── SOURCES: registered inbound doors, one signed key each ────────────────────
create table if not exists public.sources (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands(id) on delete cascade,
  tenant_id   uuid,
  source_key  text not null unique,                    -- the signed ingest key (replaces AISOLAR_TENANT_ID env)
  kind        text not null default 'website' check (kind in ('website','widget','hosted_link','campaign','partner_webhook')),
  domain      text,                                    -- solarroscommon.ie / sandersonsolar.ie
  label       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists sources_key_idx on public.sources(source_key) where active;
comment on table public.sources is 'Every door a lead can be born through. ingest-lead resolves source_key → {tenant, brand, boundary}; every lead is born carrying provenance.';

-- ── LEAD PROVENANCE: the four dimensions, never collapsed ────────────────────
alter table if exists public.leads
  add column if not exists origin_source_id uuid,
  add column if not exists origin_brand_id  uuid,
  add column if not exists origin_domain    text;      -- denormalised for the intake card
comment on column public.leads.origin_domain is 'Born-at domain, shown on the intake card ("Born: solarroscommon.ie"). Origin NEVER changes; custody moves by kernel transfer events.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.brands  enable row level security;
alter table public.sources enable row level security;
do $$ begin
  create policy brands_staff on public.brands for all
    using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant'))
    with check (public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sources_staff on public.sources for all
    using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant'))
    with check (public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;

-- WIRING (next, code not schema): ingest-lead resolves x-source-key → stamps
-- origin_* on the lead; intake card renders "Born: <domain> · <brand>" + the
-- 21-field bill extract; per-source keys minted in Owner → Settings → Sources.
