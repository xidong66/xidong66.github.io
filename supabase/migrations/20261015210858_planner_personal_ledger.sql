-- Personal bank accounts/wallets under each existing login. Never banking APIs.
begin;
create schema if not exists planner_ledger_private;
revoke all on schema planner_ledger_private from public,anon,authenticated;
grant usage on schema planner_ledger_private to authenticated;

create table public.planner_ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 80),
  currency text not null check(currency in ('CNY','GBP','SGD')),
  opening_cents bigint not null default 0 check(abs(opening_cents)<=99999999999),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(id,user_id,currency)
);
create index ledger_accounts_owner_idx on public.planner_ledger_accounts(user_id);

create table public.planner_ledger_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid,
  title text not null check(length(trim(title)) between 1 and 200),
  kind text not null check(kind in ('income','expense')),
  currency text not null check(currency in ('CNY','GBP','SGD')),
  amount_cents bigint not null check(amount_cents between 1 and 99999999999),
  category text not null check(category in ('food','transport','shopping','housing','study','travel','fun','health','subscription','salary','scholarship','sidejob','refund','other')),
  day_of_month integer not null check(day_of_month between 1 and 31),
  start_month date not null check(start_month between date '2000-01-01' and date '2100-12-01' and extract(day from start_month)=1),
  end_month date check(end_month>=start_month and end_month<=date '2100-12-01' and extract(day from end_month)=1),
  notes text not null default '' check(length(notes)<=5000),
  enabled boolean not null default true,
  removed boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(id,user_id),
  foreign key(account_id,user_id,currency) references public.planner_ledger_accounts(id,user_id,currency)
);
create index ledger_rules_owner_idx on public.planner_ledger_rules(user_id);
create index ledger_rules_account_idx on public.planner_ledger_rules(account_id,user_id,currency);

create table public.planner_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid,
  title text not null check(length(trim(title)) between 1 and 200),
  kind text not null check(kind in ('income','expense')),
  currency text not null check(currency in ('CNY','GBP','SGD')),
  amount_cents bigint not null check(amount_cents between 1 and 99999999999),
  category text not null check(category in ('food','transport','shopping','housing','study','travel','fun','health','subscription','salary','scholarship','sidejob','refund','other')),
  entry_date date not null check(entry_date between date '2000-01-01' and date '2100-12-31'),
  notes text not null default '' check(length(notes)<=5000),
  rule_id uuid,
  rule_month date,
  voided boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint ledger_entries_rule_month_key unique(rule_id,rule_month),
  check((rule_id is null and rule_month is null) or (rule_id is not null and rule_month is not null and extract(day from rule_month)=1)),
  foreign key(account_id,user_id,currency) references public.planner_ledger_accounts(id,user_id,currency),
  foreign key(rule_id,user_id) references public.planner_ledger_rules(id,user_id)
);
create index ledger_entries_owner_date_idx on public.planner_ledger_entries(user_id,entry_date,id);
create index ledger_entries_account_idx on public.planner_ledger_entries(account_id,user_id,currency);
create index ledger_entries_rule_owner_idx on public.planner_ledger_entries(rule_id,user_id);

create function planner_ledger_private.check_entry()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.entry_date>(clock_timestamp() at time zone 'Asia/Singapore')::date then
    raise exception 'ledger_future_entry' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.rule_id is distinct from old.rule_id or new.rule_month is distinct from old.rule_month) then
    raise exception 'ledger_source_immutable' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function planner_ledger_private.check_entry() from public,anon,authenticated,service_role;
create trigger ledger_entries_check before insert or update on public.planner_ledger_entries
  for each row execute function planner_ledger_private.check_entry();

do $$ declare tab text; begin
  foreach tab in array array['planner_ledger_accounts','planner_ledger_rules','planner_ledger_entries'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('create trigger ledger_touch before update on public.%I for each row execute function public.planner_touch_updated_at()',tab);
    execute format('revoke all on public.%I from public,anon,authenticated',tab);
    execute format('grant select,insert,update on public.%I to authenticated',tab);
    execute format('create policy ledger_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',tab);
    execute format('create policy ledger_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',tab);
  end loop;
end $$;
create policy ledger_account_insert on public.planner_ledger_accounts for insert to authenticated with check((select auth.uid())=user_id);
create policy ledger_account_delete on public.planner_ledger_accounts for delete to authenticated using((select auth.uid())=user_id);
grant delete on public.planner_ledger_accounts to authenticated;
create policy ledger_rule_insert on public.planner_ledger_rules for insert to authenticated with check((select auth.uid())=user_id);
create policy ledger_entry_insert on public.planner_ledger_entries for insert to authenticated
  with check((select auth.uid())=user_id and rule_id is null and rule_month is null and not voided);

-- Security invoker views preserve underlying per-user RLS. Cast sums to text so
-- even very large totals remain exact when consumed by JavaScript.
create view public.planner_ledger_balances with(security_invoker=true) as
  select a.*, count(e.id)::integer as entry_count,
    (a.opening_cents::numeric+coalesce(sum(case when e.voided then 0 when e.kind='income' then e.amount_cents else -e.amount_cents end),0))::text as balance_cents
  from public.planner_ledger_accounts a left join public.planner_ledger_entries e
    on e.account_id=a.id and e.user_id=a.user_id
  group by a.id;
create view public.planner_ledger_monthly with(security_invoker=true) as
  select user_id,date_trunc('month',entry_date)::date as month,currency,
    coalesce(sum(amount_cents) filter(where kind='income'),0)::text as income_cents,
    coalesce(sum(amount_cents) filter(where kind='expense'),0)::text as expense_cents,
    count(*)::integer as entry_count,
    count(*) filter(where account_id is null)::integer as pending_count
  from public.planner_ledger_entries where not voided group by user_id,date_trunc('month',entry_date)::date,currency;
revoke all on public.planner_ledger_balances,public.planner_ledger_monthly from public,anon,authenticated;
grant usage on schema public to authenticated;
grant select on public.planner_ledger_balances,public.planner_ledger_monthly to authenticated;

-- Internal generator. Only the owner (Cron) can call with another user's ID.
create function planner_ledger_private.post_due(p_user uuid,p_through date)
returns integer language plpgsql security definer set search_path='' as $$
declare r record; affected integer; total integer:=0;
begin
  for r in select * from public.planner_ledger_rules
    where enabled and not removed and (p_user is null or user_id=p_user)
    order by id for no key update
  loop
    insert into public.planner_ledger_entries(user_id,account_id,title,kind,currency,amount_cents,category,entry_date,notes,rule_id,rule_month)
    select r.user_id,r.account_id,r.title,r.kind,r.currency,r.amount_cents,r.category,
      least(m::date+r.day_of_month-1,(m+interval '1 month'-interval '1 day')::date),r.notes,r.id,m::date
    from generate_series(r.start_month::timestamp,
      least(coalesce(r.end_month,date_trunc('month',p_through)::date),date_trunc('month',p_through)::date)::timestamp,
      interval '1 month') m
    where least(m::date+r.day_of_month-1,(m+interval '1 month'-interval '1 day')::date)<=p_through
    on conflict on constraint ledger_entries_rule_month_key do nothing;
    get diagnostics affected=row_count;total:=total+affected;
  end loop;
  return total;
end;
$$;
revoke all on function planner_ledger_private.post_due(uuid,date) from public,anon,authenticated,service_role;

create function planner_ledger_private.post_my_due()
returns integer language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=(select auth.uid());
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return planner_ledger_private.post_due(owner_id,(clock_timestamp() at time zone 'Asia/Singapore')::date);
end;
$$;
revoke all on function planner_ledger_private.post_my_due() from public,anon,authenticated,service_role;
grant execute on function planner_ledger_private.post_my_due() to authenticated;
create function public.planner_ledger_refresh()
returns integer language sql security invoker set search_path='' as $$
  select planner_ledger_private.post_my_due();
$$;
revoke all on function public.planner_ledger_refresh() from public,anon,authenticated,service_role;
grant execute on function public.planner_ledger_refresh() to authenticated;

do $$ declare tab text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach tab in array array['planner_ledger_accounts','planner_ledger_rules','planner_ledger_entries'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tab) then
        execute format('alter publication supabase_realtime add table public.%I',tab);
      end if;
    end loop;
  end if;
end $$;
-- Daily at 00:05 Singapore time; refresh on login also catches missed runs.
-- Supabase Cron is already installed for anniversary reminders on this project.
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('planner-ledger-daily','5 16 * * *',
      $job$select planner_ledger_private.post_due(null,(clock_timestamp() at time zone 'Asia/Singapore')::date);$job$);
  end if;
end $$;
notify pgrst,'reload schema';
commit;
