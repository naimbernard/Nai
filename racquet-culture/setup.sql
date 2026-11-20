-- Racquet Culture: shared live database
-- Run this once in Supabase: SQL Editor, New query, paste everything, Run. Safe to run again.

-- Player profiles. One row per account, created when someone signs up.
create table if not exists public.rc_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null check (char_length(username) between 3 and 100 and username ~ '^[A-Za-z0-9._-]+$'),
  name        text not null check (char_length(name) between 1 and 60),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create unique index if not exists rc_profiles_username_lower on public.rc_profiles (lower(username));

-- Logged games. Levels and rankings are worked out from these, so everyone sees the same numbers.
create table if not exists public.rc_matches (
  id          text primary key,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.rc_profiles enable row level security;
alter table public.rc_matches  enable row level security;

-- Signed-in players can see everyone's profile and every game.
-- Each player can only create or change their own profile, log games as themselves,
-- and delete games they logged.
drop policy if exists "rc profiles read"   on public.rc_profiles;
drop policy if exists "rc profiles insert" on public.rc_profiles;
drop policy if exists "rc profiles update" on public.rc_profiles;
create policy "rc profiles read"   on public.rc_profiles for select to authenticated using (true);
create policy "rc profiles insert" on public.rc_profiles for insert to authenticated with check (auth.uid() = id);
create policy "rc profiles update" on public.rc_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "rc matches read"   on public.rc_matches;
drop policy if exists "rc matches insert" on public.rc_matches;
drop policy if exists "rc matches delete" on public.rc_matches;
create policy "rc matches read"   on public.rc_matches for select to authenticated using (true);
create policy "rc matches insert" on public.rc_matches for insert to authenticated with check (auth.uid() = created_by);
create policy "rc matches delete" on public.rc_matches for delete to authenticated using (auth.uid() = created_by);

grant select, insert, update on public.rc_profiles to authenticated;
grant select, insert, delete on public.rc_matches  to authenticated;

-- "Is this username taken?" for the sign-up page, before the person has an account.
-- Answers yes or no only; it never reveals anyone's profile.
create or replace function public.rc_username_taken(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_profiles where lower(username) = lower(trim(u)));
$$;
revoke all on function public.rc_username_taken(text) from public;
grant execute on function public.rc_username_taken(text) to anon, authenticated;

-- Send new games and profile changes to everyone who has the app open.
alter table public.rc_profiles replica identity full;
alter table public.rc_matches  replica identity full;
do $$ begin alter publication supabase_realtime add table public.rc_profiles; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rc_matches;  exception when duplicate_object then null; end $$;
