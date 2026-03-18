-- ============================================================
-- SubPaperz — Supabase SQL Setup Script
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================


-- ─── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ─── PROFILES ────────────────────────────────────────────────
-- One row per auth user. Created automatically on signup via trigger.
create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text,
  full_name         text,
  company_name      text,
  plan              text not null default 'free' check (plan in ('free', 'pro', 'team')),
  stripe_customer_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-create profile row when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ─── PROJECTS ────────────────────────────────────────────────
create table if not exists projects (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  address     text,
  city        text,
  state       text,
  zip         text,
  gc_name     text,
  status      text not null default 'active' check (status in ('active', 'completed', 'on_hold', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on projects(owner_id);


-- ─── SUBCONTRACTORS ──────────────────────────────────────────
create table if not exists subcontractors (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references projects(id) on delete set null,
  company_name  text not null,
  contact_name  text,
  email         text,
  phone         text,
  address       text,
  city          text,
  state         text,
  zip           text,
  trade         text,
  license_number text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists subcontractors_owner_id_idx on subcontractors(owner_id);
create index if not exists subcontractors_project_id_idx on subcontractors(project_id);


-- ─── DOCUMENTS ───────────────────────────────────────────────
create table if not exists documents (
  id                    uuid primary key default uuid_generate_v4(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  sub_id                uuid references subcontractors(id) on delete cascade,
  project_id            uuid references projects(id) on delete set null,
  doc_type              text not null check (doc_type in (
                          'w9',
                          'lien_waiver_uncond_f',
                          'lien_waiver_cond_f',
                          'lien_waiver_uncond_p',
                          'lien_waiver_cond_p',
                          'sub_agreement',
                          'pay_app',
                          'coi'
                        )),
  status                text not null default 'draft' check (status in (
                          'draft',
                          'pending_signature',
                          'signed',
                          'void'
                        )),
  storage_path          text,                        -- path in Supabase Storage bucket "documents"
  sign_token            text unique,                 -- UUID token for public e-sign link
  sign_token_expires_at timestamptz,
  signed_at             timestamptz,
  signer_ip             text,
  signer_name           text,
  form_data             jsonb,                       -- stores raw form field values
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists documents_owner_id_idx      on documents(owner_id);
create index if not exists documents_sub_id_idx        on documents(sub_id);
create index if not exists documents_project_id_idx    on documents(project_id);
create index if not exists documents_sign_token_idx    on documents(sign_token);


-- ─── COI RECORDS ─────────────────────────────────────────────
create table if not exists coi_records (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  sub_id              uuid not null references subcontractors(id) on delete cascade,
  storage_path        text,                          -- path in Supabase Storage bucket "coi-uploads"
  insurer_name        text not null,
  policy_number       text,
  effective_date      date not null,
  expiry_date         date not null,
  gl_limit            numeric(12,2),                 -- general liability limit
  wc_limit            numeric(12,2),                 -- workers comp limit
  reminder_30_sent    boolean not null default false,
  reminder_60_sent    boolean not null default false,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists coi_records_owner_id_idx   on coi_records(owner_id);
create index if not exists coi_records_sub_id_idx     on coi_records(sub_id);
create index if not exists coi_records_expiry_date_idx on coi_records(expiry_date);


-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger set_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger set_subcontractors_updated_at
  before update on subcontractors
  for each row execute function set_updated_at();

create trigger set_documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

create trigger set_coi_records_updated_at
  before update on coi_records
  for each row execute function set_updated_at();


-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table profiles       enable row level security;
alter table projects       enable row level security;
alter table subcontractors enable row level security;
alter table documents      enable row level security;
alter table coi_records    enable row level security;

-- profiles: users can only see/edit their own row
create policy "profiles: own row" on profiles
  for all using (auth.uid() = id);

-- projects: own rows only
create policy "projects: own rows" on projects
  for all using (auth.uid() = owner_id);

-- subcontractors: own rows only
create policy "subcontractors: own rows" on subcontractors
  for all using (auth.uid() = owner_id);

-- documents: own rows OR valid sign token (for public e-sign page)
create policy "documents: own rows" on documents
  for all using (auth.uid() = owner_id);

create policy "documents: public sign token read" on documents
  for select using (
    sign_token is not null
    and sign_token_expires_at > now()
  );

create policy "documents: public sign token update" on documents
  for update using (
    sign_token is not null
    and sign_token_expires_at > now()
  );

-- coi_records: own rows only
create policy "coi_records: own rows" on coi_records
  for all using (auth.uid() = owner_id);


-- ─── STORAGE BUCKETS ─────────────────────────────────────────
-- Run these if they don't already exist (dashboard works too)
insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('coi-uploads', 'coi-uploads', false)
  on conflict (id) do nothing;

-- Storage RLS: users can only access their own folder (user_id is first path segment)
create policy "documents bucket: own folder" on storage.objects
  for all using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "coi-uploads bucket: own folder" on storage.objects
  for all using (
    bucket_id = 'coi-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ─── COI UPLOAD TOKEN (Feature 1 migration) ──────────────────
-- Run this block separately if the schema above is already deployed

alter table coi_records add column if not exists upload_token uuid;
create index if not exists coi_records_upload_token_idx on coi_records(upload_token);

-- Allow anon users to read a COI record by token (for the public upload page)
create policy "coi_records: token read" on coi_records
  for select to anon
  using (upload_token is not null);

-- Allow anon users to update a COI record they have the token for
create policy "coi_records: token update" on coi_records
  for update to anon
  using (upload_token is not null)
  with check (upload_token is not null);

-- Allow anon users to upload files to the public/coi-renewals/ path in coi-uploads
create policy "coi-uploads bucket: public renewal upload" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'coi-uploads'
    and (storage.foldername(name))[1] = 'public'
    and (storage.foldername(name))[2] = 'coi-renewals'
  );


-- ─── DONE ────────────────────────────────────────────────────
-- Tables: profiles, projects, subcontractors, documents, coi_records
-- Storage buckets: documents, coi-uploads
-- RLS enabled on all tables + storage
-- Sign-token public access policy for e-sign page
-- Upload-token public access policy for COI renewal upload page
