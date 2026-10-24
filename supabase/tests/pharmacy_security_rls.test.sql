begin;

do $$ begin begin create extension if not exists pgtap with schema extensions; exception when others then null; end; end; $$;
select plan(44);

select ok(not has_table_privilege('authenticated', 'public.pharmacy_applications', 'INSERT'), 'clients cannot create applications directly');
select ok(not has_table_privilege('authenticated', 'public.pharmacy_applications', 'UPDATE'), 'clients cannot update application review fields');
select ok(not has_table_privilege('authenticated', 'public.pharmacy_documents', 'INSERT'), 'clients cannot create document metadata directly');
select ok(not has_table_privilege('authenticated', 'public.pharmacy_documents', 'UPDATE'), 'clients cannot update document review or OCR fields');
select ok(not has_table_privilege('authenticated', 'public.pharmacy_medicines', 'INSERT'), 'clients cannot insert inventory outside the backend');
select ok(not has_table_privilege('authenticated', 'public.pharmacy_medicines', 'UPDATE'), 'clients cannot update inventory outside the backend');
select ok(not has_table_privilege('authenticated', 'public.user_notifications', 'UPDATE'), 'clients cannot forge notification changes');
select ok(not has_table_privilege('authenticated', 'public.pharmacies', 'INSERT'), 'clients cannot create pharmacies directly');
select ok(not has_table_privilege('authenticated', 'public.pharmacy_memberships', 'INSERT'), 'clients cannot grant themselves membership');
select ok(not has_table_privilege('authenticated', 'private.security_challenges', 'SELECT'), 'security challenges are inaccessible to authenticated clients');
select ok(not has_table_privilege('authenticated', 'private.verification_reviewers', 'SELECT'), 'reviewer allowlist is inaccessible to authenticated clients');
select ok(has_table_privilege('authenticated', 'public.pharmacy_documents', 'SELECT'), 'document reads reach owner-manager RLS');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.pharmacies (id, display_name)
values
  ('00000000-0000-0000-0000-000000000010', 'RLS Test Pharmacy'),
  ('00000000-0000-0000-0000-000000000011', 'Other Test Pharmacy');

insert into public.pharmacy_memberships (pharmacy_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'OWNER'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'STAFF'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'OWNER');

insert into public.pharmacy_applications (id, pharmacy_id, created_by)
values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001');

insert into public.pharmacy_documents (
  id, pharmacy_id, application_id, uploaded_by, document_type, storage_path,
  original_filename, mime_type, size_bytes
) values (
  '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
  'FDA_LICENSE', '00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000010/license.pdf',
  'license.pdf', 'application/pdf', 100
);

insert into public.medicine_catalog (id, normalized_key, generic_name, brand_name, dosage_value, dosage_unit, category)
values ('00000000-0000-0000-0000-000000000040', 'rls-test|medicine|1|mg', 'RLS Test', 'Medicine', 1, 'mg', 'Test');

insert into public.pharmacy_medicines (id, pharmacy_id, medicine_id, price, stock_status, created_by, updated_by)
values (
  '00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000040', 10, 'HIGH_STOCK',
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
);

insert into public.user_notifications (id, user_id, pharmacy_id, type, title, message)
values (
  '00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010', 'APPLICATION', 'Test', 'Test notification'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.pharmacy_documents), 0, 'staff cannot read regulatory documents');
select is((select count(*)::integer from public.pharmacy_medicines), 1, 'active staff can read their pharmacy inventory');
select is((select count(*)::integer from public.pharmacy_applications), 0, 'staff cannot read the owner application');

reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.pharmacy_documents where pharmacy_id = '00000000-0000-0000-0000-000000000010'), 1, 'owner can read own regulatory documents');
select is((select count(*)::integer from public.pharmacy_applications), 2, 'owner can read only applications they created');
select is((select count(*)::integer from public.user_notifications), 1, 'owner can read own notifications');

select throws_ok(
  $$update public.pharmacy_documents set status = 'VERIFIED' where id = '00000000-0000-0000-0000-000000000030'$$,
  '42501', 'permission denied for table pharmacy_documents', 'owner cannot directly change document verification status'
);
select throws_ok(
  $$update public.pharmacy_applications set status = 'APPROVED' where id = '00000000-0000-0000-0000-000000000020'$$,
  '42501', 'permission denied for table pharmacy_applications', 'owner cannot directly approve an application'
);
select throws_ok(
  $$update public.pharmacy_medicines set pharmacy_id = '00000000-0000-0000-0000-000000000011' where id = '00000000-0000-0000-0000-000000000050'$$,
  '42501', 'permission denied for table pharmacy_medicines', 'client cannot reassign inventory ownership'
);
select throws_ok(
  $$update public.user_notifications set title = 'Forged' where id = '00000000-0000-0000-0000-000000000060'$$,
  '42501', 'permission denied for table user_notifications', 'client cannot forge notification content'
);

reset role;
select set_config('request.jwt.claims', '', true);
select throws_ok(
  $$update public.pharmacy_applications
      set status = 'APPROVED', reviewed_by = '00000000-0000-0000-0000-000000000002', reviewed_at = now()
    where id = '00000000-0000-0000-0000-000000000020'$$,
  '23514', 'Invalid pharmacy application state transition', 'database rejects draft-to-approved transition'
);
select throws_ok(
  $$insert into public.pharmacy_documents (
      pharmacy_id, application_id, uploaded_by, document_type, storage_path,
      original_filename, mime_type, size_bytes
    ) values (
      '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000021',
      '00000000-0000-0000-0000-000000000001', 'BUSINESS_PERMIT',
      '00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000010/mismatch.pdf',
      'mismatch.pdf', 'application/pdf', 100
    )$$,
  '23503', 'insert or update on table "pharmacy_documents" violates foreign key constraint "pharmacy_documents_application_owner_fk"',
  'document cannot link to another pharmacy application'
);

update public.pharmacy_applications
   set business_name = 'RLS Test Pharmacy', registration_number = 'RLS-REG-1', permit_number = 'RLS-PERMIT-1', status = 'SUBMITTED'
 where id = '00000000-0000-0000-0000-000000000020';
select is(
  (select verification_status from public.pharmacies where id = '00000000-0000-0000-0000-000000000010'),
  'SUBMITTED'::public.application_status,
  'application submission synchronizes pharmacy verification status'
);
select throws_ok(
  $$update public.pharmacy_applications
      set status = 'APPROVED', reviewed_by = '00000000-0000-0000-0000-000000000002', reviewed_at = now()
    where id = '00000000-0000-0000-0000-000000000020'$$,
  '42501', 'Authorized verification reviewer is required', 'unlisted user cannot approve an application'
);
insert into private.verification_reviewers(user_id, granted_by)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
update public.pharmacy_applications set status = 'UNDER_REVIEW'
 where id = '00000000-0000-0000-0000-000000000020';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
update public.pharmacy_applications
   set status = 'APPROVED', reviewed_by = '00000000-0000-0000-0000-000000000002', reviewed_at = now()
 where id = '00000000-0000-0000-0000-000000000020';
select is(
  (select verification_status from public.pharmacies where id = '00000000-0000-0000-0000-000000000010'),
  'APPROVED'::public.application_status,
  'authorized approval synchronizes pharmacy verification status'
);

update public.pharmacy_documents
   set status = 'OCR_COMPLETE', ocr_text = 'sensitive raw OCR', ocr_fields = '{"license":"secret"}'::jsonb
 where id = '00000000-0000-0000-0000-000000000030';
update public.pharmacy_documents
   set status = 'VERIFIED', reviewed_by = '00000000-0000-0000-0000-000000000002', reviewed_at = now()
 where id = '00000000-0000-0000-0000-000000000030';
select is((select ocr_text from public.pharmacy_documents where id = '00000000-0000-0000-0000-000000000030'), null, 'raw OCR text is purged after verification');
select is((select ocr_fields from public.pharmacy_documents where id = '00000000-0000-0000-0000-000000000030'), '{}'::jsonb, 'OCR candidate fields are purged after verification');
select ok((select ocr_purged_at is not null from public.pharmacy_documents where id = '00000000-0000-0000-0000-000000000030'), 'OCR purge is timestamped');

select throws_ok(
  $$update public.pharmacy_medicines
      set updated_by = '00000000-0000-0000-0000-000000000003'
    where id = '00000000-0000-0000-0000-000000000050'$$,
  '42501', 'Inventory actor must be an active member of the pharmacy', 'database rejects a non-member inventory actor'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into storage.objects(bucket_id, name)
values ('pharmacy-documents', '00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000010/owner.pdf');
select is((select count(*)::integer from storage.objects where bucket_id = 'pharmacy-documents'), 1, 'owner can upload and read a document in the owned pharmacy path');
insert into storage.objects(bucket_id, name)
values ('pharmacy-media', '00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000010/logo.png');
select is((select count(*)::integer from storage.objects where bucket_id = 'pharmacy-media'), 0, 'public media retrieval does not grant authenticated object listing');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into storage.objects(bucket_id, name)
    values ('pharmacy-documents', '00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000010/staff.pdf')$$,
  '42501', 'new row violates row-level security policy for table "objects"', 'staff cannot upload regulatory documents'
);
reset role;
select set_config('request.jwt.claims', '', true);

select is((select public from storage.buckets where id = 'pharmacy-documents'), false, 'regulatory document bucket is private');
select is((select public from storage.buckets where id = 'pharmacy-media'), true, 'non-sensitive pharmacy media bucket is public');

select throws_ok(
  $$insert into public.pharmacy_applications (pharmacy_id, created_by, status)
    values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'APPROVED')$$,
  '23514', 'New pharmacy applications must start in DRAFT status', 'database rejects non-draft new application status'
);

select throws_ok(
  $$insert into public.pharmacy_applications (pharmacy_id, created_by, status, reviewed_by, reviewed_at)
    values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'DRAFT', '00000000-0000-0000-0000-000000000002', now())$$,
  '23514', 'New applications cannot be created with reviewer metadata', 'database rejects new application with reviewer metadata'
);

select throws_ok(
  $$insert into public.pharmacy_documents (
      pharmacy_id, application_id, uploaded_by, document_type, storage_path,
      original_filename, mime_type, size_bytes, status
    ) values (
      '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020',
      '00000000-0000-0000-0000-000000000001', 'FDA_LICENSE',
      '00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000010/forged_verified.pdf',
      'forged_verified.pdf', 'application/pdf', 100, 'VERIFIED'
    )$$,
  '23514', 'New verification documents must start in UPLOADED status', 'database rejects non-uploaded new document status'
);

select throws_ok(
  $$insert into public.pharmacy_documents (
      pharmacy_id, application_id, uploaded_by, document_type, storage_path,
      original_filename, mime_type, size_bytes, reviewed_by, reviewed_at
    ) values (
      '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020',
      '00000000-0000-0000-0000-000000000001', 'FDA_LICENSE',
      '00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000010/forged_reviewer.pdf',
      'forged_reviewer.pdf', 'application/pdf', 100, '00000000-0000-0000-0000-000000000002', now()
    )$$,
  '23514', 'New documents cannot be created with reviewer metadata', 'database rejects new document with reviewer metadata'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$update public.pharmacy_applications
      set status = 'APPROVED', reviewed_by = '00000000-0000-0000-0000-000000000003', reviewed_at = now()
    where id = '00000000-0000-0000-0000-000000000020'$$,
  '42501', 'Reviewer identity must match the authenticated administrator', 'reviewer cannot spoof another administrator UUID'
);
select set_config('request.jwt.claims', '', true);

select throws_ok(
  $$insert into public.inventory_history (pharmacy_id, listing_id, actor_id, action)
    values (
      '00000000-0000-0000-0000-000000000011',
      '00000000-0000-0000-0000-000000000050',
      '00000000-0000-0000-0000-000000000001',
      'CREATED'
    )$$,
  '23503', 'Inventory history must reference a medicine listing belonging to the same pharmacy',
  'inventory history listing must belong to the same pharmacy'
);

insert into public.user_profiles (user_id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Test Owner');
select throws_ok(
  $$update public.user_profiles set created_at = now() - interval '1 year' where user_id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', 'User profile identity and creation timestamp are immutable', 'profile creation timestamp is immutable'
);

update storage.buckets set public = true where id = 'pharmacy-documents';
select throws_ok(
  $$do $assert$ begin if exists (select 1 from storage.buckets where id = 'pharmacy-documents' and public is not false) then raise exception using errcode = '23514', message = 'Regulatory document storage bucket must be private'; end if; end; $assert$;$$,
  '23514', 'Regulatory document storage bucket must be private', 'database asserts regulatory document bucket cannot remain public'
);
update storage.buckets set public = false where id = 'pharmacy-documents';

select * from finish();
rollback;
