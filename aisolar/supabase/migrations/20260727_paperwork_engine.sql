-- Cal (23 Jul 2026): "these all get saved in supabase right?" — this makes
-- that true. The paperwork engine's persistence layer: every document in the
-- pack (SEAI app/offer, NC6, DOW, ITC cert, RECI upload, BER email-in) is a
-- row; files live in a storage bucket; tenant settings hold the owner's
-- terms/finance/brand JSON. Idempotent, add-only.

-- Year built: SEAI grant application requires it
alter table if exists public.lead_intake
  add column if not exists year_built text;
comment on column public.lead_intake.year_built is 'SEAI grant application requires the year the property was built';

-- The pack: one row per document per lead
create table if not exists public.lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'seai_application','seai_offer','esb_loa','nc6','nc7','nc7_01','nc7_02','nc7_03','nc8','nc5','block_diagram','declaration_of_works','datasheet',
    'inspection_test_cert','reci_cert','ber_cert','handover_pack','other'
  )),
  status text not null default 'not_started' check (status in (
    'not_started','prepared','awaiting_signature','sent','received','complete'
  )),
  source text not null default 'agent' check (source in ('agent','upload','email-in','installer')),
  storage_path text,               -- documents bucket path once a file exists
  uploaded_by uuid,                -- auth.users id for uploads (the REC, the installer)
  emailed_from text,               -- sender address for email-in docs (BER assessor)
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, doc_type)
);

-- RLS: tenant staff read/write; anonymous never
alter table public.lead_documents enable row level security;
do $$ begin
  create policy lead_documents_staff on public.lead_documents
    for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Storage bucket for the files themselves (certs, BERs, packs)
insert into storage.buckets (id, name, public)
values ('lead-documents', 'lead-documents', false)
on conflict (id) do nothing;

-- Owner-level settings: proposal terms, finance config, brand overrides —
-- the localStorage stores' server home. One row per tenant per key.
create table if not exists public.tenant_settings (
  tenant_id uuid not null,
  key text not null check (key in ('proposal_terms','finance_config','tenant_brand')),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, key)
);
alter table public.tenant_settings enable row level security;
do $$ begin
  create policy tenant_settings_staff on public.tenant_settings
    for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

comment on table public.lead_documents is 'The paperwork pack: agents prepare/track/chase; registered humans sign and submit. DOW completion triggers send to the tenant BER assessor.';

-- Cal: the bill reader captures premises type (domestic | commercial) so the
-- agents know which ESB form + SEAI scheme applies — before anyone visits.
alter table if exists public.lead_intake
  add column if not exists extracted_premises_type text
  check (extracted_premises_type in ('domestic','commercial') or extracted_premises_type is null);
