-- Cal (30 Jul 2026): "make the migration logic all safe now that it's in your
-- head." The Sweep 8 persistence for the 14-page SEALED ESB SUBMISSION PACK —
-- moving the field record off client-side localStorage onto Postgres + the
-- existing `lead-documents` Storage bucket, so it's bulletproof for the first
-- cohort and 100+ installers.
--
-- ARCHITECTURE DECISION (the important one): the actual bytes of every
-- attachment (RECI cert, Declaration of Works, type-test cert, single-line
-- diagram) and the sealed pack live in **Supabase Storage** (the `lead-documents`
-- bucket, already created by 20260727_paperwork_engine). Postgres stores the
-- **storage path + SHA-256 seal + size**, NOT the binary. bytea-in-Postgres is an
-- anti-pattern at cohort scale — it bloats backups, breaks replication, and hits
-- TOAST/row limits. Metadata-in-Postgres + bytes-in-object-store is the
-- institutional pattern, and 20260727 already chose it. This migration finishes it.
--
-- REUSES (does not duplicate): `public.lead_documents` (the 4 certs map to its
-- existing doc_types reci_cert / declaration_of_works / inspection_test_cert /
-- block_diagram) and the `lead-documents` bucket. ADDS: installed_equipment (the
-- commissioning-gate attestation, = fieldRecord.ts SerialState), esb_submissions
-- (the submission record + the browser-agent write-back target), the seal columns
-- on lead_documents, and a server home for companyCompliance.
--
-- Idempotent, add-only. NOT DEPLOYED — parks behind GATE 0 (keys) + GATE B
-- (OA/GRIDS/COMH alignment). Deploy: `supabase db push` once the gates open.
-- (No explicit begin/commit — the Supabase CLI runs each migration in its own
-- transaction, matching 20260727_paperwork_engine.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · installed_equipment  (Sweep 8 "M1") — the commissioning-gate attestation.
--     One row per fitted inverter (unit_index → multi-unit #7). Maps 1:1 to
--     fieldRecord.ts `SerialState`. What the crew ATTESTED on site — the ONLY
--     source that puts fitted kit + the Table-1 protection Y's on the NC6.
--     Language law: ATTESTED by the named installer, never machine-verified.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.installed_equipment (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null references public.leads(id) on delete cascade,
  unit_index           int  not null default 1,           -- multi-unit: 1 row per inverter
  fitted_model         text,                               -- off the rating plate
  serial               text,                               -- off the plate
  ac_rating_kw         text,                               -- AC rating (kW) — NEVER the DC kWp
  export_limit         text,                               -- the REAL commissioned export setting
  rated_current_a      text,                               -- "as per Type Test" — captured, not derived
  type_test_cert_ref   text,                               -- NC6 §5A cert reference
  first_connection     text check (first_connection in ('yes','no') or first_connection is null),
  protection_confirmed boolean not null default false,     -- EN 50549-1 Table 1 attested at the gate
  mismatch_flagged     boolean not null default false,     -- fitted <> proposal, never cleared silently
  note                 text,                               -- why — rides with the record on a mismatch
  confirmed            boolean not null default false,     -- the gate: every digit confirmed on site
  attested_by          uuid,                               -- auth.users id of the named installer (eIDAS)
  attested_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (lead_id, unit_index)
);
comment on table public.installed_equipment is
  'Commissioning-gate attestation (fieldRecord SerialState). Attested by the named installer on site — the source of fitted kit + NC6 Table-1 protection Y''s. One row per inverter (unit_index).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · lead_documents seal columns — persist the tamper-evident SHA-256 + size +
--     original filename so a pack/cert can be VERIFIED without re-opening the
--     file. (The 4 certs already have a home here; these columns complete it.)
-- ─────────────────────────────────────────────────────────────────────────────
alter table if exists public.lead_documents
  add column if not exists sha256        text,   -- tamper-evident seal of the stored bytes
  add column if not exists size_bytes    bigint,
  add column if not exists original_name text;   -- the uploaded filename (CertFile.name)
comment on column public.lead_documents.sha256 is 'SHA-256 of the stored file — the seal; matches the value stamped into the pack.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · esb_submissions — the SUBMISSION RECORD. One row per sealed NC6 pack: the
--     stored pack path + its SHA-256 seal, the completeness snapshot, and the
--     lifecycle sealed → staged → submitted → accepted/rejected → superseded.
--     This is the row a future `portal_submitter` browser agent writes back to:
--     esb_reference + submitted_at stay NULL until a REAL portal submission
--     (truth-pass — never a fabricated reference). Re-submissions chain via
--     `supersedes` (ESB rejections happen; v2 must point at v1).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.esb_submissions (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references public.leads(id) on delete cascade,
  form               text not null default 'nc6' check (form in ('nc6','nc7','nc5','nc8')),
  pack_document_id   uuid references public.lead_documents(id) on delete set null,
  pack_storage_path  text,                          -- the sealed 14-page PDF in lead-documents
  pack_sha256        text,                          -- the seal (== the PDF's embedded seal)
  page_count         int,
  mprn               text,
  installer_name     text,                          -- the attesting installer at seal time
  reci_number        text,
  completeness_ready boolean not null default false,
  missing            jsonb   not null default '[]'::jsonb,   -- nc6Completeness().missing snapshot
  status             text    not null default 'sealed' check (status in (
                       'sealed','staged','submitted','accepted','rejected','superseded')),
  esb_reference      text,                          -- REAL portal ref on submission — never fabricated
  reject_reason      text,
  supersedes         uuid references public.esb_submissions(id) on delete set null,
  sealed_by          uuid,
  sealed_at          timestamptz not null default now(),
  submitted_by       uuid,
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists esb_submissions_lead_idx   on public.esb_submissions(lead_id);
create index if not exists esb_submissions_status_idx on public.esb_submissions(status);
comment on table public.esb_submissions is
  'One row per sealed ESB submission pack. Lifecycle sealed→staged→submitted→accepted/rejected/superseded. esb_reference/submitted_* NULL until a REAL portal submission (truth-pass). The browser-automation agent''s write-back target.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · companyCompliance server home — extend tenant_settings' allowed keys so the
--     owner's RECI number / company mobile / email / address (which NC6
--     completeness gates on) live per-tenant server-side, not localStorage.
--     Required before 100+ installers: each tenant's installer block must persist.
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop whatever check constraint(s) exist on tenant_settings (there is only the
-- `key` one) by their real names, then add the widened one — robust to the
-- original's auto-generated name, and idempotent on re-run.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
     where n.nspname = 'public' and rel.relname = 'tenant_settings' and con.contype = 'c'
  loop
    execute format('alter table public.tenant_settings drop constraint %I', c.conname);
  end loop;
  alter table public.tenant_settings
    add constraint tenant_settings_key_check
    check (key in ('proposal_terms','finance_config','tenant_brand','company_compliance'));
exception when undefined_table then null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · updated_at — shared trigger (create-or-replace = idempotent), attached to
--     the two new tables via the duplicate-object guard.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$ begin
  create trigger trg_installed_equipment_updated before update on public.installed_equipment
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger trg_esb_submissions_updated before update on public.esb_submissions
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · RLS — the recursion-safe public.has_role() helper (from the v3 / role_mgmt
--     migrations), NOT the naive auth.role()='authenticated'. Staff read; the
--     installer (or admin) owns the commissioning attestation + the seal.
--     NOTE (A9, still open): this is role-scoped on the single-tenant workbench.
--     True per-tenant isolation (tenant_id + a current_tenant() predicate) is the
--     open RLS floor and lands with the multi-tenant migration — flagged, not faked.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.installed_equipment enable row level security;
alter table public.esb_submissions     enable row level security;

do $$ begin
  create policy installed_equipment_read on public.installed_equipment
    for select using (
      public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy installed_equipment_write on public.installed_equipment
    for all using (
      public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'installer'))
    with check (
      public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'installer'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy esb_submissions_read on public.esb_submissions
    for select using (
      public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy esb_submissions_write on public.esb_submissions
    for all using (
      public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'))
    with check (
      public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'consultant') or public.has_role(auth.uid(),'installer'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DEPLOY (when GATE 0 + GATE B open):
--   supabase db push
-- VERIFY:
--   select to_regclass('public.installed_equipment'), to_regclass('public.esb_submissions');
--   select column_name from information_schema.columns
--     where table_name='lead_documents' and column_name in ('sha256','size_bytes','original_name');
--   -- RLS on: staff read, anon denied
--   set role anon; select * from public.esb_submissions;   -- must return 0 / permission denied
-- WIRING (app + edge, next — NOT in this migration):
--   • JobViewV2 writes installed_equipment + lead_documents (cert upload → Storage) instead of localStorage.
--   • A `seal-esb-pack` edge fn: buildSubmissionPack server-side (or accept the client blob),
--     PUT to lead-documents/<lead>/esb-pack-<ts>.pdf, insert esb_submissions{status:'sealed'}.
--   • companyCompliance → tenant_settings(key='company_compliance').
--   • (Phase 2) portal_submitter browser agent flips status staged→submitted + writes esb_reference.
-- ─────────────────────────────────────────────────────────────────────────────
