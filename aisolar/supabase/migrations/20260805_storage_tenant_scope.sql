-- 20260805_storage_tenant_scope.sql
-- 🔴 Hardening (deep sweep, 5 Aug): the survey-photos + project-documents storage
-- buckets were NOT tenant-scoped — INSERT allowed ANY authenticated user, SELECT
-- allowed ANY staff of ANY tenant. They hold customer home photos + documents, so
-- once populated any cohort installer could read every other tenant's customer
-- media. Buckets are currently EMPTY → fixed before any leak. Objects are stored
-- at `{lead_id}/...`, so scope by the lead's tenant via own_lead / can_see_lead.
drop policy if exists "Authenticated users can upload survey photos"      on storage.objects;
drop policy if exists "Authenticated users can upload project documents"  on storage.objects;
drop policy if exists "Staff can read survey photos"                      on storage.objects;
drop policy if exists "Staff can read project documents"                  on storage.objects;
drop policy if exists "Owners can delete their own survey photos"         on storage.objects;
drop policy if exists "Owners can update/delete their own survey photos"  on storage.objects;

-- survey-photos — staff of the lead's tenant only (customer read is via server-signed URLs)
create policy "survey-photos tenant insert" on storage.objects for insert
  with check (bucket_id='survey-photos' and public.own_lead(((storage.foldername(name))[1])::uuid));
create policy "survey-photos tenant read" on storage.objects for select
  using (bucket_id='survey-photos' and public.can_see_lead(((storage.foldername(name))[1])::uuid));
create policy "survey-photos tenant modify" on storage.objects for update
  using (bucket_id='survey-photos' and public.own_lead(((storage.foldername(name))[1])::uuid))
  with check (bucket_id='survey-photos' and public.own_lead(((storage.foldername(name))[1])::uuid));
create policy "survey-photos tenant delete" on storage.objects for delete
  using (bucket_id='survey-photos' and public.own_lead(((storage.foldername(name))[1])::uuid));

-- project-documents — same lead-scoping (used for install evidence too)
create policy "project-docs tenant insert" on storage.objects for insert
  with check (bucket_id='project-documents' and public.own_lead(((storage.foldername(name))[1])::uuid));
create policy "project-docs tenant read" on storage.objects for select
  using (bucket_id='project-documents' and public.can_see_lead(((storage.foldername(name))[1])::uuid));
create policy "project-docs tenant delete" on storage.objects for delete
  using (bucket_id='project-documents' and public.own_lead(((storage.foldername(name))[1])::uuid));
