-- ─────────────────────────────────────────────────────────────────────────────
-- Doc-vocabulary reconciliation (4 Aug 2026) — the paper trail's one gap in the
-- CHECK: the inverter TYPE-TEST certificate is a real ESB NC6 attachment (§5A)
-- and a fieldRecord cert key ('typeTest'), but lead_documents.doc_type had no
-- value for it, so it could never be recorded. Widen the CHECK to add it.
--
-- Add-only + idempotent: drop the existing doc_type check by its real name(s),
-- re-add the widened one. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  c record;
begin
  -- Drop whatever check constraint currently governs lead_documents.doc_type
  -- (auto-generated name), so we can re-add the widened list idempotently.
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'lead_documents'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%doc_type%'
  loop
    execute format('alter table public.lead_documents drop constraint %I', c.conname);
  end loop;

  alter table public.lead_documents
    add constraint lead_documents_doc_type_check check (doc_type in (
      'seai_application','seai_offer','esb_loa',
      'nc6','nc7','nc7_01','nc7_02','nc7_03','nc8','nc5',
      'block_diagram','declaration_of_works','datasheet',
      'inspection_test_cert','reci_cert','ber_cert','type_test_cert',
      'handover_pack','other'
    ));
end $$;

comment on constraint lead_documents_doc_type_check on public.lead_documents is
  'Canonical document vocabulary — matches src/lib/docVocab.ts DocType. type_test_cert added 4 Aug (inverter EN 50549-1 cert, NC6 §5A attachment).';
