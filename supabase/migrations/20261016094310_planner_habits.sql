begin;
create schema if not exists planner_habits_private;
revoke all on schema planner_habits_private from public,anon,authenticated;
grant usage on schema planner_habits_private to authenticated;

create table public.planner_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120),
  color text not null default 'sage' check(color in ('sage','blue','rose','amber','lavender','teal')),
  start_date date not null default ((clock_timestamp() at time zone 'Asia/Singapore')::date)
    check(start_date between date '2000-01-01' and date '2100-12-31'),
  notes text not null default '' check(length(notes)<=1000),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(id,user_id)
);
create index planner_habits_owner_idx on public.planner_habits(user_id,created_at,id);

create table public.planner_habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_date date not null check(check_date between date '2000-01-01' and date '2100-12-31'),
  created_at timestamptz not null default clock_timestamp(),
  unique(habit_id,check_date),
  foreign key(habit_id,user_id) references public.planner_habits(id,user_id) on delete cascade
);
create index planner_habit_checkins_owner_date_idx on public.planner_habit_checkins(user_id,check_date,id);
create index planner_habit_checkins_habit_owner_idx on public.planner_habit_checkins(habit_id,user_id);

create function planner_habits_private.check_habit()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.start_date>(clock_timestamp() at time zone 'Asia/Singapore')::date then
    raise exception 'habit_future_start' using errcode='23514';
  end if;
  if tg_op='UPDATE' and new.start_date>old.start_date and exists(
    select 1 from public.planner_habit_checkins where habit_id=old.id and user_id=old.user_id and check_date<new.start_date
  ) then
    raise exception 'habit_start_after_checkins' using errcode='23514';
  end if;
  return new;
end;
$$;
create function planner_habits_private.check_checkin()
returns trigger language plpgsql security invoker set search_path='' as $$
declare begins date;
begin
  if new.check_date>(clock_timestamp() at time zone 'Asia/Singapore')::date then
    raise exception 'habit_future_checkin' using errcode='23514';
  end if;
  -- Serialize against moving the start date, preserving valid history.
  select start_date into begins from public.planner_habits
    where id=new.habit_id and user_id=new.user_id for share;
  if not found then raise exception 'habit_unavailable' using errcode='42501';end if;
  if new.check_date<begins then raise exception 'habit_before_start' using errcode='23514';end if;
  return new;
end;
$$;
revoke all on function planner_habits_private.check_habit(),planner_habits_private.check_checkin() from public,anon,authenticated,service_role;
create trigger planner_habits_check before insert or update on public.planner_habits
  for each row execute function planner_habits_private.check_habit();
create trigger planner_habits_touch before update on public.planner_habits
  for each row execute function public.planner_touch_updated_at();
create trigger planner_habit_checkins_check before insert on public.planner_habit_checkins
  for each row execute function planner_habits_private.check_checkin();

alter table public.planner_habits enable row level security;
alter table public.planner_habit_checkins enable row level security;
revoke all on public.planner_habits,public.planner_habit_checkins from public,anon,authenticated;
grant select,insert,update,delete on public.planner_habits to authenticated;
grant select,insert,delete on public.planner_habit_checkins to authenticated;
grant usage on schema public to authenticated;

create policy habits_select on public.planner_habits for select to authenticated using((select auth.uid())=user_id);
create policy habits_insert on public.planner_habits for insert to authenticated with check((select auth.uid())=user_id);
create policy habits_update on public.planner_habits for update to authenticated
  using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy habits_delete on public.planner_habits for delete to authenticated using((select auth.uid())=user_id);
create policy habit_checkins_select on public.planner_habit_checkins for select to authenticated using((select auth.uid())=user_id);
create policy habit_checkins_insert on public.planner_habit_checkins for insert to authenticated with check((select auth.uid())=user_id);
create policy habit_checkins_delete on public.planner_habit_checkins for delete to authenticated using((select auth.uid())=user_id);

do $$ declare tab text;begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach tab in array array['planner_habits','planner_habit_checkins'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tab) then
        execute format('alter publication supabase_realtime add table public.%I',tab);
      end if;
    end loop;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
