-- Run once in the Supabase SQL Editor. These columns match Backend/app.py.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_time_order check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_registration_per_user unique (event_id, user_id)
);

create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists registrations_user_created_idx on public.registrations(user_id, created_at desc);
create index if not exists registrations_event_idx on public.registrations(event_id);

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "events are browseable" on public.events;
create policy "events are browseable" on public.events for select to anon, authenticated using (true);

drop policy if exists "users see own profile or organizer sees attendees" on public.users;
create policy "users see own profile or organizer sees attendees" on public.users
  for select to authenticated using (
    id = (select auth.uid()) or exists (
      select 1 from public.registrations r
      join public.events e on e.id = r.event_id
      where r.user_id = users.id and e.organizer_id = (select auth.uid())
    )
  );

drop policy if exists "registrations visible to attendee or organizer" on public.registrations;
create policy "registrations visible to attendee or organizer" on public.registrations
  for select to authenticated using (
    user_id = (select auth.uid()) or exists (
      select 1 from public.events e
      where e.id = registrations.event_id and e.organizer_id = (select auth.uid())
    )
  );

drop policy if exists "users register themselves" on public.registrations;
create policy "users register themselves" on public.registrations
  for insert to authenticated with check (user_id = (select auth.uid()));

-- RLS controls which rows each role can see; these grants expose the tables
-- through the Supabase Data API in the first place.
grant select on public.events to anon, authenticated;
grant select on public.users to authenticated;
grant select, insert on public.registrations to authenticated;
