-- Run once in Supabase Dashboard > SQL Editor. Safe to rerun.
-- No private tasks, passwords, email addresses or administrator keys belong here.
begin;

create table if not exists public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  notes text not null default '' check (length(notes) <= 5000),
  start_date date not null check (start_date between date '2000-01-01' and date '2100-12-31'),
  start_time time without time zone,
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 1440),
  category text not null default 'research' check (category in ('research','course','life','other')),
  important boolean not null default false,
  repeat text not null default 'none' check (repeat in ('none','daily','weekly','monthly')),
  repeat_interval integer not null default 1 check (repeat_interval between 1 and 99),
  weekdays smallint[] not null default '{}'
    check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[] and array_position(weekdays, null) is null),
  repeat_until date check (repeat_until is null or (repeat_until >= start_date and repeat_until <= date '2100-12-31')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (id, user_id),
  check (repeat <> 'weekly' or cardinality(weekdays) > 0)
);

create table if not exists public.planner_occurrences (
  task_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_date date not null check (original_date between date '2000-01-01' and date '2100-12-31'),
  completed boolean not null default false,
  skipped boolean not null default false,
  override_date date check (override_date between date '2000-01-01' and date '2100-12-31'),
  start_time time without time zone,
  duration_minutes integer check (duration_minutes between 5 and 1440),
  title text check (length(trim(title)) between 1 and 200),
  notes text check (length(notes) <= 5000),
  category text check (category in ('research','course','life','other')),
  important boolean,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (task_id, original_date),
  foreign key (task_id,user_id) references public.planner_tasks(id,user_id) on delete cascade
);

create index if not exists planner_tasks_user_idx on public.planner_tasks(user_id);
create index if not exists planner_occurrences_user_idx on public.planner_occurrences(user_id);

-- Invoker, fixed search path: cannot acquire elevated privileges.
create or replace function public.planner_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.planner_touch_updated_at() from public, anon, authenticated;

drop trigger if exists planner_tasks_touch on public.planner_tasks;
create trigger planner_tasks_touch before update on public.planner_tasks
  for each row execute function public.planner_touch_updated_at();
drop trigger if exists planner_occurrences_touch on public.planner_occurrences;
create trigger planner_occurrences_touch before update on public.planner_occurrences
  for each row execute function public.planner_touch_updated_at();

alter table public.planner_tasks enable row level security;
alter table public.planner_occurrences enable row level security;

drop policy if exists planner_tasks_own on public.planner_tasks;
create policy planner_tasks_own on public.planner_tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists planner_occurrences_own on public.planner_occurrences;
create policy planner_occurrences_own on public.planner_occurrences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Project setup deliberately disabled automatic Data API grants.
-- Expose only these tables, only to signed-in users; never to visitors.
revoke all on public.planner_tasks from public, anon, authenticated;
revoke all on public.planner_occurrences from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.planner_tasks to authenticated;
grant select,insert,update,delete on public.planner_occurrences to authenticated;

-- Realtime for immediate cross-device updates. App also refreshes every 30s,
-- and on focus/reconnection, covering filtered DELETE limitations and fallbacks.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planner_tasks') then
      alter publication supabase_realtime add table public.planner_tasks;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planner_occurrences') then
      alter publication supabase_realtime add table public.planner_occurrences;
    end if;
  end if;
end;
$$;
-- Additional categories and anniversaries (also available as a standalone upgrade).

alter table public.planner_tasks drop constraint if exists planner_tasks_category_check;
alter table public.planner_tasks add constraint planner_tasks_category_check
  check (category in ('research','course','life','travel','date','homework','project','meeting','other'));
alter table public.planner_occurrences drop constraint if exists planner_occurrences_category_check;
alter table public.planner_occurrences add constraint planner_occurrences_category_check
  check (category in ('research','course','life','travel','date','homework','project','meeting','other'));

create table if not exists public.planner_anniversaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  date date not null check (date between date '1900-01-01' and date '2100-12-31'),
  mode text not null default 'countdown' check (mode in ('countdown','countup')),
  yearly boolean not null default false,
  pinned boolean not null default false,
  notes text not null default '' check (length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  check (not yearly or mode = 'countdown')
);
create index if not exists planner_anniversaries_user_idx on public.planner_anniversaries(user_id);
drop trigger if exists planner_anniversaries_touch on public.planner_anniversaries;
create trigger planner_anniversaries_touch before update on public.planner_anniversaries
  for each row execute function public.planner_touch_updated_at();
alter table public.planner_anniversaries enable row level security;
drop policy if exists planner_anniversaries_own on public.planner_anniversaries;
create policy planner_anniversaries_own on public.planner_anniversaries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.planner_anniversaries from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.planner_anniversaries to authenticated;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'planner_anniversaries') then
    alter publication supabase_realtime add table public.planner_anniversaries;
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
