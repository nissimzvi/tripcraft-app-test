-- TripCraft V85 - run once in Supabase SQL Editor to enable cloud trip history.
create table if not exists public.trips (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  destination text not null default '',
  start_date date,
  end_date date,
  draft jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trips enable row level security;
drop policy if exists "users_select_own_trips" on public.trips;
create policy "users_select_own_trips" on public.trips for select using (auth.uid() = user_id);
drop policy if exists "users_insert_own_trips" on public.trips;
create policy "users_insert_own_trips" on public.trips for insert with check (auth.uid() = user_id);
drop policy if exists "users_update_own_trips" on public.trips;
create policy "users_update_own_trips" on public.trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users_delete_own_trips" on public.trips;
create policy "users_delete_own_trips" on public.trips for delete using (auth.uid() = user_id);
