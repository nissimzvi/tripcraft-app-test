-- TripCraft V107: run this entire file in Supabase SQL Editor.
-- It creates the persistent trip table used by Build Trip, My Trips and permanent links.

create table if not exists public.tripcraft_trips (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'TripCraft trip',
  destination text not null default '',
  start_date date,
  end_date date,
  draft jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tripcraft_trips enable row level security;

drop policy if exists "tripcraft_trips_select_own" on public.tripcraft_trips;
create policy "tripcraft_trips_select_own" on public.tripcraft_trips
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "tripcraft_trips_insert_own" on public.tripcraft_trips;
create policy "tripcraft_trips_insert_own" on public.tripcraft_trips
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "tripcraft_trips_update_own" on public.tripcraft_trips;
create policy "tripcraft_trips_update_own" on public.tripcraft_trips
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tripcraft_trips_delete_own" on public.tripcraft_trips;
create policy "tripcraft_trips_delete_own" on public.tripcraft_trips
for delete to authenticated using (auth.uid() = user_id);

create index if not exists tripcraft_trips_user_updated_idx
on public.tripcraft_trips (user_id, updated_at desc);

grant select, insert, update, delete on table public.tripcraft_trips to authenticated;
