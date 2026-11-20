-- JFM Property Platform: shared live database
-- Run this once in Supabase: SQL Editor, New query, paste, Run.

create table if not exists public.records (
  id          text primary key,
  kind        text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create index if not exists records_kind on public.records (kind);

alter table public.records enable row level security;

-- DEMO RULES: anyone with the site can read and change the data.
-- Fine for fictional demo data only. Replace before any real resident data goes in.
drop policy if exists "demo read"   on public.records;
drop policy if exists "demo insert" on public.records;
drop policy if exists "demo update" on public.records;
drop policy if exists "demo delete" on public.records;
create policy "demo read"   on public.records for select using (true);
create policy "demo insert" on public.records for insert with check (true);
create policy "demo update" on public.records for update using (true) with check (true);
create policy "demo delete" on public.records for delete using (true);

grant select, insert, update, delete on public.records to anon, authenticated;

-- Send every change to everyone who has the app open
alter table public.records replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;

-- V10: storage for site inspection photos and videos
insert into storage.buckets (id, name, public, file_size_limit)
values ('inspection-media', 'inspection-media', true, 104857600)
on conflict (id) do nothing;

-- DEMO RULES: anyone with the site can add and view inspection files.
drop policy if exists "demo media read"   on storage.objects;
drop policy if exists "demo media upload" on storage.objects;
create policy "demo media read"   on storage.objects for select using (bucket_id = 'inspection-media');
create policy "demo media upload" on storage.objects for insert with check (bucket_id = 'inspection-media');

-- V10.10: storage for accounts Excel files (Accounts history on each building's Accounts tab)
-- Safe to run more than once.
insert into storage.buckets (id, name, public, file_size_limit)
values ('accounts-files', 'accounts-files', true, 10485760)
on conflict (id) do nothing;

-- DEMO RULES: anyone with the site can add and download accounts files.
drop policy if exists "demo accounts read"   on storage.objects;
drop policy if exists "demo accounts upload" on storage.objects;
create policy "demo accounts read"   on storage.objects for select using (bucket_id = 'accounts-files');
create policy "demo accounts upload" on storage.objects for insert with check (bucket_id = 'accounts-files');
