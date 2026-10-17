begin;
create table public.planner_weight_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null check(record_date between date '2000-01-01' and date '2100-12-31'),
  weight_hundredths integer not null check(weight_hundredths between 1 and 99999),
  notes text not null default '' check(length(notes)<=1000),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(user_id,record_date)
);
-- The unique index also covers the owner foreign key and date-range reads.
create function public.planner_validate_weight_date()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.record_date>(clock_timestamp() at time zone 'Asia/Singapore')::date then
    raise exception 'weight_future_date' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.planner_validate_weight_date() from public,anon,authenticated,service_role;
create trigger planner_weight_date before insert or update on public.planner_weight_records
  for each row execute function public.planner_validate_weight_date();
create trigger planner_weight_touch before update on public.planner_weight_records
  for each row execute function public.planner_touch_updated_at();
alter table public.planner_weight_records enable row level security;
revoke all on public.planner_weight_records from public,anon,authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.planner_weight_records to authenticated;
create policy weight_select on public.planner_weight_records for select to authenticated using((select auth.uid())=user_id);
create policy weight_insert on public.planner_weight_records for insert to authenticated with check((select auth.uid())=user_id);
create policy weight_update on public.planner_weight_records for update to authenticated
  using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy weight_delete on public.planner_weight_records for delete to authenticated using((select auth.uid())=user_id);
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='planner_weight_records'
  ) then alter publication supabase_realtime add table public.planner_weight_records;end if;
end $$;
notify pgrst,'reload schema';
commit;
