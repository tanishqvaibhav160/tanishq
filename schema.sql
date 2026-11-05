-- Data model used by the API (run for a new Supabase project).
-- Existing tables are not changed by CREATE TABLE IF NOT EXISTS; migrate
-- existing data separately before applying this to an existing project.

create table if not exists public.users (
  uuid uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text
);

create table if not exists public.events (
  event_id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(uuid) on delete cascade,
  title text not null,
  capacity integer not null check (capacity >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(uuid) on delete cascade,
  event_id uuid not null references public.events(event_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_registration_per_student unique (student_id, event_id)
);

create index if not exists events_created_at_idx on public.events(created_at desc);
create index if not exists events_student_idx on public.events(student_id);
create index if not exists registrations_student_created_idx
  on public.registrations(student_id, created_at desc);
create index if not exists registrations_event_idx on public.registrations(event_id);

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "events are browseable" on public.events;
create policy "events are browseable" on public.events
  for select to anon, authenticated using (true);

drop policy if exists "users see own profile or event attendees" on public.users;
create policy "users see own profile or event attendees" on public.users
  for select to authenticated using (
    uuid = (select auth.uid()) or exists (
      select 1 from public.registrations r
      join public.events e on e.event_id = r.event_id
      where r.student_id = users.uuid and e.student_id = (select auth.uid())
    )
  );

drop policy if exists "registrations visible to student or event owner" on public.registrations;
create policy "registrations visible to student or event owner" on public.registrations
  for select to authenticated using (
    student_id = (select auth.uid()) or exists (
      select 1 from public.events e
      where e.event_id = registrations.event_id and e.student_id = (select auth.uid())
    )
  );

drop policy if exists "students register themselves" on public.registrations;
create policy "students register themselves" on public.registrations
  for insert to authenticated with check (student_id = (select auth.uid()));

grant select on public.events to anon, authenticated;
grant select on public.users to authenticated;
grant select, insert on public.registrations to authenticated;
