BEGIN;
-- Oath of Care pharmacy portal baseline.
-- This file is intentionally safe to review before remote application.
-- It has NOT been applied to the connected Supabase project.

create schema if not exists private;

create type public.application_status as enum
  ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'SUSPENDED');
create type public.membership_role as enum ('OWNER', 'MANAGER', 'STAFF');
create type public.membership_status as enum ('ACTIVE', 'SUSPENDED', 'REVOKED');
create type public.stock_status as enum ('HIGH_STOCK', 'MEDIUM_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');
create type public.document_type as enum ('FDA_LICENSE', 'BUSINESS_PERMIT', 'PHARMACIST_PRC_ID');
create type public.document_status as enum ('UPLOADED', 'OCR_COMPLETE', 'UNDER_REVIEW', 'VERIFIED', 'NEEDS_UPDATE', 'REJECTED');
create type public.notification_type as enum ('LOW_STOCK', 'STOCK_ACCURACY', 'VERIFICATION', 'APPLICATION', 'SUPPORT', 'SECURITY');
create type public.analytics_event_type as enum ('SEARCH_APPEARANCE', 'PROFILE_VIEW', 'PATIENT_CONFIRMATION', 'OUT_OF_STOCK_REPORT');

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 160),
  contact_email text,
  contact_phone text,
  full_address text,
  barangay text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  concise_address text,
  logo_path text,
  verification_status public.application_status not null default 'DRAFT',
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.pharmacy_memberships (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id, user_id)
);
create index pharmacy_memberships_user_idx on public.pharmacy_memberships(user_id, status);

create table public.pharmacy_applications (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null unique references public.pharmacies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  status public.application_status not null default 'DRAFT',
  business_name text,
  business_type text,
  registration_number text,
  permit_number text,
  tin text,
  registered_address text,
  contact_person text,
  reviewer_message text,
  requested_changes jsonb not null default '[]'::jsonb check (jsonb_typeof(requested_changes) = 'array'),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, pharmacy_id),
  check (reviewed_by is null or reviewed_by <> created_by),
  check (status not in ('NEEDS_CHANGES','APPROVED','REJECTED','SUSPENDED') or (reviewed_by is not null and reviewed_at is not null)),
  check ((status in ('SUBMITTED','UNDER_REVIEW','NEEDS_CHANGES','APPROVED','REJECTED','SUSPENDED') and submitted_at is not null) or status = 'DRAFT')
);
create unique index pharmacy_application_registration_unique on public.pharmacy_applications(lower(registration_number)) where registration_number is not null;
create unique index pharmacy_application_permit_unique on public.pharmacy_applications(lower(permit_number)) where permit_number is not null;

create table public.pharmacy_operating_hours (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  is_open boolean not null default true,
  is_24_hours boolean not null default false,
  opens_at time,
  closes_at time,
  unique (pharmacy_id, day_of_week),
  check (not is_open or is_24_hours or (opens_at is not null and closes_at is not null))
);

create table public.pharmacy_closures (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  closure_date date not null,
  is_closed boolean not null default true,
  opens_at time,
  closes_at time,
  note text,
  unique (pharmacy_id, closure_date),
  check (is_closed or (opens_at is not null and closes_at is not null))
);

create table public.pharmacy_documents (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  application_id uuid,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  document_type public.document_type not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  status public.document_status not null default 'UPLOADED',
  ocr_text text,
  ocr_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(ocr_fields) = 'object'),
  quality_warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(quality_warnings) = 'array'),
  expires_at date,
  reviewer_message text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  ocr_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pharmacy_documents_application_owner_fk
    foreign key (application_id, pharmacy_id) references public.pharmacy_applications(id, pharmacy_id) on delete cascade,
  check (reviewed_by is null or reviewed_by <> uploaded_by),
  check (status not in ('VERIFIED','NEEDS_UPDATE','REJECTED') or (reviewed_by is not null and reviewed_at is not null))
);
create index pharmacy_documents_pharmacy_idx on public.pharmacy_documents(pharmacy_id, created_at desc);

create table public.medicine_catalog (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null unique,
  generic_name text not null check (char_length(trim(generic_name)) between 2 and 160),
  brand_name text not null check (char_length(trim(brand_name)) between 1 and 160),
  dosage_value numeric(12,3) not null check (dosage_value > 0),
  dosage_unit text not null check (dosage_unit in ('mg','g','mcg','mL','L','%','IU','tablet','capsule')),
  category text not null,
  prescription_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pharmacy_medicines (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  medicine_id uuid not null references public.medicine_catalog(id) on delete restrict,
  price numeric(12,2) not null check (price >= 0),
  stock_status public.stock_status not null,
  active boolean not null default true,
  version bigint not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id, medicine_id),
  unique (id, pharmacy_id)
);
create index pharmacy_medicines_active_idx on public.pharmacy_medicines(pharmacy_id, active, updated_at desc);
create index pharmacy_medicines_stock_idx on public.pharmacy_medicines(pharmacy_id, stock_status) where active;

create table public.inventory_history (
  id bigint generated always as identity primary key,
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  listing_id uuid not null references public.pharmacy_medicines(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('CREATED','UPDATED','DEACTIVATED','IMPORTED')),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now(),
  constraint inventory_history_listing_pharmacy_fk
    foreign key (listing_id, pharmacy_id) references public.pharmacy_medicines(id, pharmacy_id) on delete cascade
);
create index inventory_history_pharmacy_idx on public.inventory_history(pharmacy_id, created_at desc);

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.user_notifications(user_id, read_at, created_at desc);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  event_type public.analytics_event_type not null,
  occurred_at timestamptz not null default now(),
  visitor_hash text,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);
create index analytics_events_range_idx on public.analytics_events(pharmacy_id, occurred_at, event_type);
create unique index analytics_events_dedupe_idx on public.analytics_events(pharmacy_id, event_type, dedupe_key) where dedupe_key is not null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  pharmacy_id uuid references public.pharmacies(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_pharmacy_idx on public.audit_logs(pharmacy_id, created_at desc);

create table private.security_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_digest text not null,
  verified_token_digest text,
  attempts smallint not null default 0 check (attempts between 0 and 10),
  expires_at timestamptz not null,
  verified_until timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index security_challenges_user_idx on private.security_challenges(user_id, created_at desc);

revoke all on table private.security_challenges from public, anon, authenticated;

create table private.verification_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((active and revoked_at is null) or (not active and revoked_at is not null))
);
revoke all on table private.verification_reviewers from public, anon, authenticated;

create or replace function private.is_pharmacy_member(target_pharmacy uuid, allowed_roles public.membership_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.pharmacy_memberships m
    where m.pharmacy_id = target_pharmacy
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
      and (allowed_roles is null or m.role = any(allowed_roles))
  );
$$;
revoke all on function private.is_pharmacy_member(uuid, public.membership_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_pharmacy_member(uuid, public.membership_role[]) to authenticated;

create or replace function private.is_pharmacy_member_path(target_pharmacy text, allowed_roles public.membership_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.pharmacy_memberships m
    where m.pharmacy_id::text = target_pharmacy
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
      and (allowed_roles is null or m.role = any(allowed_roles))
  );
$$;
revoke all on function private.is_pharmacy_member_path(text, public.membership_role[]) from public;
grant execute on function private.is_pharmacy_member_path(text, public.membership_role[]) to authenticated;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public;

create or replace function private.guard_pharmacy_application()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.pharmacy_memberships m
      where m.pharmacy_id = new.pharmacy_id and m.user_id = new.created_by
        and m.role = 'OWNER' and m.status = 'ACTIVE'
    ) then
      raise exception using errcode = '42501', message = 'Application creator must be the active pharmacy owner';
    end if;
    if new.status is distinct from 'DRAFT' then
      raise exception using errcode = '23514', message = 'New pharmacy applications must start in DRAFT status';
    end if;
    if new.reviewed_by is not null or new.reviewed_at is not null or new.reviewer_message is not null then
      raise exception using errcode = '23514', message = 'New applications cannot be created with reviewer metadata';
    end if;
    if new.submitted_at is not null then
      raise exception using errcode = '23514', message = 'New applications cannot be created with submission timestamp';
    end if;
    if new.requested_changes is distinct from '[]'::jsonb then
      raise exception using errcode = '23514', message = 'New applications cannot have requested changes';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.pharmacy_id is distinct from old.pharmacy_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'Application ownership fields are immutable';
  end if;

  if new.status is distinct from old.status and not (
       (old.status = 'DRAFT' and new.status = 'SUBMITTED')
    or (old.status = 'SUBMITTED' and new.status in ('UNDER_REVIEW','NEEDS_CHANGES','APPROVED','REJECTED'))
    or (old.status = 'UNDER_REVIEW' and new.status in ('NEEDS_CHANGES','APPROVED','REJECTED'))
    or (old.status = 'NEEDS_CHANGES' and new.status = 'SUBMITTED')
    or (old.status = 'APPROVED' and new.status = 'SUSPENDED')
    or (old.status = 'SUSPENDED' and new.status in ('APPROVED','REJECTED'))
  ) then
    raise exception using errcode = '23514', message = 'Invalid pharmacy application state transition';
  end if;

  if row(new.business_name, new.business_type, new.registration_number, new.permit_number,
         new.tin, new.registered_address, new.contact_person)
     is distinct from
     row(old.business_name, old.business_type, old.registration_number, old.permit_number,
         old.tin, old.registered_address, old.contact_person)
     and old.status not in ('DRAFT','NEEDS_CHANGES') then
    raise exception using errcode = '23514', message = 'Application details are locked in the current state';
  end if;

  if new.status = 'SUBMITTED' and old.status in ('DRAFT','NEEDS_CHANGES') then
    new.submitted_at = now();
    new.reviewed_by = null;
    new.reviewed_at = null;
    new.reviewer_message = null;
    new.requested_changes = '[]'::jsonb;
  end if;

  if new.reviewed_by is not null and (old.reviewed_by is null or new.reviewed_by is distinct from old.reviewed_by) then
    if (select auth.uid()) is not null and new.reviewed_by is distinct from (select auth.uid()) then
      raise exception using errcode = '42501', message = 'Reviewer identity must match the authenticated administrator';
    end if;
  end if;

  if new.status in ('NEEDS_CHANGES','APPROVED','REJECTED','SUSPENDED') then
    if new.reviewed_by is null or new.reviewed_at is null then
      raise exception using errcode = '23514', message = 'Reviewed application states require reviewer identity and timestamp';
    end if;
    if not exists (
      select 1 from private.verification_reviewers r
      where r.user_id = new.reviewed_by and r.active
    ) then
      raise exception using errcode = '42501', message = 'Authorized verification reviewer is required';
    end if;
  end if;

  if new.status not in ('NEEDS_CHANGES','APPROVED','REJECTED','SUSPENDED')
     and (new.reviewed_by is not null or new.reviewed_at is not null) then
    raise exception using errcode = '23514', message = 'Unreviewed application states cannot have reviewer identity or timestamp';
  end if;

  return new;
end;
$$;
revoke all on function private.guard_pharmacy_application() from public;

create or replace function private.sync_pharmacy_verification_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.pharmacies
     set verification_status = new.status, version = version + 1
   where id = new.pharmacy_id and verification_status is distinct from new.status;
  return new;
end;
$$;
revoke all on function private.sync_pharmacy_verification_status() from public;

create or replace function private.guard_pharmacy_document()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.pharmacy_memberships m
      where m.pharmacy_id = new.pharmacy_id and m.user_id = new.uploaded_by
        and m.status = 'ACTIVE' and m.role in ('OWNER','MANAGER')
    ) then
      raise exception using errcode = '42501', message = 'Only an active owner or manager may upload regulatory documents';
    end if;
    if new.status is distinct from 'UPLOADED' then
      raise exception using errcode = '23514', message = 'New verification documents must start in UPLOADED status';
    end if;
    if new.reviewed_by is not null or new.reviewed_at is not null or new.reviewer_message is not null then
      raise exception using errcode = '23514', message = 'New documents cannot be created with reviewer metadata';
    end if;
    if new.ocr_text is not null or new.ocr_fields is distinct from '{}'::jsonb or new.ocr_purged_at is not null then
      raise exception using errcode = '23514', message = 'New documents cannot be created with OCR or purge metadata';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.pharmacy_id is distinct from old.pharmacy_id
     or new.application_id is distinct from old.application_id
     or new.uploaded_by is distinct from old.uploaded_by
     or new.document_type is distinct from old.document_type
     or new.storage_path is distinct from old.storage_path
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'Document ownership fields are immutable';
  end if;

  if new.status is distinct from old.status and not (
       (old.status = 'UPLOADED' and new.status in ('OCR_COMPLETE','UNDER_REVIEW'))
    or (old.status = 'OCR_COMPLETE' and new.status in ('UNDER_REVIEW','VERIFIED','NEEDS_UPDATE','REJECTED'))
    or (old.status = 'UNDER_REVIEW' and new.status in ('VERIFIED','NEEDS_UPDATE','REJECTED'))
    or (old.status = 'NEEDS_UPDATE' and new.status in ('UPLOADED','OCR_COMPLETE','UNDER_REVIEW'))
  ) then
    raise exception using errcode = '23514', message = 'Invalid document verification state transition';
  end if;

  if new.reviewed_by is not null and (old.reviewed_by is null or new.reviewed_by is distinct from old.reviewed_by) then
    if (select auth.uid()) is not null and new.reviewed_by is distinct from (select auth.uid()) then
      raise exception using errcode = '42501', message = 'Reviewer identity must match the authenticated administrator';
    end if;
  end if;

  if new.status in ('VERIFIED','NEEDS_UPDATE','REJECTED') then
    if new.reviewed_by is null or new.reviewed_at is null then
      raise exception using errcode = '23514', message = 'Reviewed document states require reviewer identity and timestamp';
    end if;
    if not exists (
      select 1 from private.verification_reviewers r
      where r.user_id = new.reviewed_by and r.active
    ) then
      raise exception using errcode = '42501', message = 'Authorized verification reviewer is required';
    end if;
  end if;

  if new.status not in ('VERIFIED','NEEDS_UPDATE','REJECTED')
     and (new.reviewed_by is not null or new.reviewed_at is not null) then
    raise exception using errcode = '23514', message = 'Unreviewed document states cannot have reviewer identity or timestamp';
  end if;

  if new.status in ('VERIFIED','REJECTED') and old.status is distinct from new.status then
    new.ocr_text = null;
    new.ocr_fields = '{}'::jsonb;
    new.ocr_purged_at = now();
  end if;
  return new;
end;
$$;
revoke all on function private.guard_pharmacy_document() from public;

create or replace function private.guard_pharmacy_medicine()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
       new.id is distinct from old.id
    or new.pharmacy_id is distinct from old.pharmacy_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '23514', message = 'Inventory ownership fields are immutable';
  end if;

  if tg_op = 'INSERT' and new.created_by is distinct from new.updated_by then
    raise exception using errcode = '23514', message = 'Inventory creator and initial updater must match';
  end if;

  if not exists (
    select 1 from public.pharmacy_memberships m
    where m.pharmacy_id = new.pharmacy_id and m.user_id = new.updated_by
      and m.status = 'ACTIVE' and m.role in ('OWNER','MANAGER','STAFF')
  ) then
    raise exception using errcode = '42501', message = 'Inventory actor must be an active member of the pharmacy';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_pharmacy_medicine() from public;

create or replace function private.guard_user_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.created_at is distinct from old.created_at then
      raise exception using errcode = '23514', message = 'User profile identity and creation timestamp are immutable';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_user_profile() from public;

create or replace function private.guard_inventory_history()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    raise exception using errcode = '23514', message = 'Inventory history records are immutable';
  end if;
  if not exists (
    select 1 from public.pharmacy_medicines pm
    where pm.id = new.listing_id and pm.pharmacy_id = new.pharmacy_id
  ) then
    raise exception using errcode = '23503', message = 'Inventory history must reference a medicine listing belonging to the same pharmacy';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_inventory_history() from public;

create trigger user_profiles_touch before update on public.user_profiles for each row execute function private.touch_updated_at();
create trigger user_profiles_guard before update on public.user_profiles for each row execute function private.guard_user_profile();
create trigger pharmacies_touch before update on public.pharmacies for each row execute function private.touch_updated_at();
create trigger memberships_touch before update on public.pharmacy_memberships for each row execute function private.touch_updated_at();
create trigger applications_touch before update on public.pharmacy_applications for each row execute function private.touch_updated_at();
create trigger documents_touch before update on public.pharmacy_documents for each row execute function private.touch_updated_at();
create trigger catalog_touch before update on public.medicine_catalog for each row execute function private.touch_updated_at();
create trigger medicines_touch before update on public.pharmacy_medicines for each row execute function private.touch_updated_at();
create trigger inventory_history_guard before insert or update or delete on public.inventory_history for each row execute function private.guard_inventory_history();
create trigger applications_guard before insert or update on public.pharmacy_applications for each row execute function private.guard_pharmacy_application();
create trigger applications_sync_status after insert or update of status on public.pharmacy_applications for each row execute function private.sync_pharmacy_verification_status();
create trigger documents_guard before insert or update on public.pharmacy_documents for each row execute function private.guard_pharmacy_document();
create trigger medicines_guard before insert or update on public.pharmacy_medicines for each row execute function private.guard_pharmacy_medicine();

alter table public.user_profiles enable row level security;
alter table public.pharmacies enable row level security;
alter table public.pharmacy_memberships enable row level security;
alter table public.pharmacy_applications enable row level security;
alter table public.pharmacy_operating_hours enable row level security;
alter table public.pharmacy_closures enable row level security;
alter table public.pharmacy_documents enable row level security;
alter table public.medicine_catalog enable row level security;
alter table public.pharmacy_medicines enable row level security;
alter table public.inventory_history enable row level security;
alter table public.user_notifications enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.user_profiles to authenticated;
grant select on public.pharmacies, public.pharmacy_memberships, public.pharmacy_applications,
  public.pharmacy_operating_hours, public.pharmacy_closures, public.pharmacy_documents,
  public.medicine_catalog, public.pharmacy_medicines, public.inventory_history,
  public.user_notifications, public.analytics_events, public.audit_logs to authenticated;

create policy user_profiles_select on public.user_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy user_profiles_insert on public.user_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_profiles_update on public.user_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy pharmacies_member_select on public.pharmacies for select to authenticated using ((select private.is_pharmacy_member(id, null)));
create policy memberships_self_select on public.pharmacy_memberships for select to authenticated using ((select auth.uid()) = user_id);
create policy applications_owner_select on public.pharmacy_applications for select to authenticated using (created_by = (select auth.uid()));

create policy hours_member_select on public.pharmacy_operating_hours for select to authenticated using ((select private.is_pharmacy_member(pharmacy_id, null)));
create policy hours_manager_insert on public.pharmacy_operating_hours for insert to authenticated with check ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[])));
create policy hours_manager_update on public.pharmacy_operating_hours for update to authenticated using ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[]))) with check ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[])));
create policy closures_member_select on public.pharmacy_closures for select to authenticated using ((select private.is_pharmacy_member(pharmacy_id, null)));
create policy closures_manager_insert on public.pharmacy_closures for insert to authenticated with check ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[])));
create policy closures_manager_update on public.pharmacy_closures for update to authenticated using ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[]))) with check ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[])));

create policy documents_manager_select on public.pharmacy_documents for select to authenticated
  using ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[])));
create policy catalog_authenticated_select on public.medicine_catalog for select to authenticated using (true);
create policy medicines_member_select on public.pharmacy_medicines for select to authenticated using ((select private.is_pharmacy_member(pharmacy_id, null)));
create policy history_member_select on public.inventory_history for select to authenticated using ((select private.is_pharmacy_member(pharmacy_id, null)));
create policy notifications_self_select on public.user_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy analytics_member_select on public.analytics_events for select to authenticated using ((select private.is_pharmacy_member(pharmacy_id, null)));
create policy audit_member_select on public.audit_logs for select to authenticated using ((select private.is_pharmacy_member(pharmacy_id, array['OWNER','MANAGER']::public.membership_role[])));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pharmacy-documents', 'pharmacy-documents', false, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('pharmacy-media', 'pharmacy-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if exists (
    select 1 from storage.buckets
    where id = 'pharmacy-documents' and public is not false
  ) then
    raise exception using errcode = '23514', message = 'Regulatory document storage bucket must be private';
  end if;
end;
$$;

-- Supabase Storage RLS is already enabled.
-- Do not alter storage.objects ownership or RLS here.

create policy pharmacy_documents_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'pharmacy-documents'
    and (select private.is_pharmacy_member_path((storage.foldername(name))[2], array['OWNER','MANAGER']::public.membership_role[])));
create policy pharmacy_documents_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pharmacy-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_pharmacy_member_path((storage.foldername(name))[2], array['OWNER','MANAGER']::public.membership_role[])));
create policy pharmacy_media_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pharmacy-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_pharmacy_member_path((storage.foldername(name))[2], array['OWNER','MANAGER']::public.membership_role[])));

grant usage, select on all sequences in schema public to authenticated;

-- The pre-implementation project audit found this legacy helper exposed as an RPC.
-- Revoke it only when present; triggers/owners can still use it internally.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;


COMMIT;
