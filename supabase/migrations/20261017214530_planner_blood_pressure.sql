begin;
create table public.planner_blood_pressure (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null check(measured_at>=timestamptz '2000-01-01 00:00:00+08' and measured_at<timestamptz '2101-01-01 00:00:00+08'),
  systolic smallint not null check(systolic between 1 and 999),
  diastolic smallint not null check(diastolic between 1 and 999),
  pulse smallint check(pulse between 1 and 999),
  notes text not null default '' check(length(notes)<=1000),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check(systolic>diastolic)
);
-- Multiple readings may share a day or time; each is an independent measurement.
create index planner_bp_owner_time_idx on public.planner_blood_pressure(user_id,measured_at,id);
create function public.planner_validate_bp_time()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.measured_at>clock_timestamp() then raise exception 'bp_future_time' using errcode='23514';end if;
  return new;
end;
$$;
revoke all on function public.planner_validate_bp_time() from public,anon,authenticated,service_role;
create trigger planner_bp_time before insert or update on public.planner_blood_pressure
  for each row execute function public.planner_validate_bp_time();
create trigger planner_bp_touch before update on public.planner_blood_pressure
  for each row execute function public.planner_touch_updated_at();
alter table public.planner_blood_pressure enable row level security;
revoke all on public.planner_blood_pressure from public,anon,authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.planner_blood_pressure to authenticated;
create policy bp_select on public.planner_blood_pressure for select to authenticated using((select auth.uid())=user_id);
create policy bp_insert on public.planner_blood_pressure for insert to authenticated with check((select auth.uid())=user_id);
create policy bp_update on public.planner_blood_pressure for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy bp_delete on public.planner_blood_pressure for delete to authenticated using((select auth.uid())=user_id);
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='planner_blood_pressure'
  ) then alter publication supabase_realtime add table public.planner_blood_pressure;end if;
end $$;
notify pgrst,'reload schema';
commit;
