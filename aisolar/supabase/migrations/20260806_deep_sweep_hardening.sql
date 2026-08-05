-- 20260806_deep_sweep_hardening.sql
-- Deep hardening sweep (double-down). Three real holes:
--
-- 1) anonymise_lead (GDPR erasure) — SECURITY DEFINER, EXECUTE by anon +
--    authenticated, and NO ownership check. Anyone with a lead UUID could erase
--    another tenant's customer data. Add an authorisation guard + revoke anon.
-- 2) storage.objects — permissive "Authenticated users can view/delete project
--    documents" + unscoped "view/update survey photos" policies let ANY signed-in
--    user read/delete/modify ANOTHER tenant's customer documents + roof photos
--    (RLS is OR'd, so these override the scoped staff/owner policies). Drop them;
--    the scoped staff-read + owner-write policies remain. (Full path→tenant
--    scoping is the completing fix — see LAST_MILE.)
-- 3) agent-queue functions (claim/complete/fail/enqueue) — SECURITY DEFINER,
--    EXECUTE by anon/authenticated → a user could manipulate the agent runtime.
--    They are only ever called by agent-drain (service role). Lock them down.

-- ── 1. anonymise_lead: authorisation guard ──────────────────────────────────
create or replace function public.anonymise_lead(p_lead_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not (public.own_lead(p_lead_id) or public.is_platform_admin(auth.uid())) then
    raise exception 'not authorised to anonymise this lead';
  end if;

  update public.leads set name='Deleted User',
      email='deleted_'||encode(gen_random_bytes(8),'hex')||'@erased.local',
      phone=null, address=null, mprn=null, access_token=null, monthly_bill=null
  where id=p_lead_id;
  update public.lead_intake set extracted_account_name=null, extracted_address=null,
      extracted_mprn=null, extracted_eircode=null, extracted_notes=null, extraction_raw=null
  where lead_id=p_lead_id;
  update public.contracts set signed_by_name='Deleted User', signed_by_email=null, signature_data=null
  where lead_id=p_lead_id;
  update public.touchpoints set summary='[redacted]' where lead_id=p_lead_id and summary like '%@%';
  delete from public.survey_photos where survey_id in (select id from public.site_surveys where lead_id=p_lead_id);
  update public.esb_submissions set mprn=null where lead_id=p_lead_id;
  update public.conversation_messages set body='[redacted]', metadata='{}'::jsonb
  where conversation_id in (select id from public.conversations where lead_id=p_lead_id);
  update public.lead_touchpoints set summary='[redacted]' where lead_id=p_lead_id and summary is not null;
  update public.installed_equipment set note='[redacted]' where lead_id=p_lead_id and note<>'';
end $function$;
revoke execute on function public.anonymise_lead(uuid) from anon;

-- ── 2. storage: drop the unscoped/permissive policies ───────────────────────
drop policy if exists "Authenticated users can view project documents"   on storage.objects;
drop policy if exists "Authenticated users can delete project documents" on storage.objects;
drop policy if exists "Authenticated users can view survey photos"       on storage.objects;
drop policy if exists "Users can update their own survey photos"         on storage.objects;

-- ── 3. agent-queue functions: service-role only ─────────────────────────────
revoke execute on function public.claim_next_agent_job(text, text, integer) from anon, authenticated;
revoke execute on function public.complete_agent_job(uuid, jsonb) from anon, authenticated;
revoke execute on function public.fail_agent_job(uuid, text) from anon, authenticated;
revoke execute on function public.enqueue_agent(text, uuid, jsonb, integer) from anon, authenticated;
