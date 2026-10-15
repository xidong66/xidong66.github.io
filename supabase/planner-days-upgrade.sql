-- Existing planner: paste this entire file into Supabase SQL Editor and Run.
-- Adds categories and private anniversaries. Safe to rerun; keeps existing data.
begin;

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
