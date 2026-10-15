-- Private reminder settings and delivery ledger. Existing data is retained.
begin;
alter table public.planner_anniversaries add column if not exists email_reminder boolean not null default false;

create table if not exists public.planner_mail_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  last_test_at timestamptz,
  last_error text
);
insert into public.planner_mail_settings(id) values (true) on conflict do nothing;
alter table public.planner_mail_settings enable row level security;
revoke all on public.planner_mail_settings from public, anon, authenticated;

create table if not exists public.planner_mail_deliveries (
  id uuid primary key default gen_random_uuid(),
  anniversary_id uuid not null references public.planner_anniversaries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  recipient text not null,
  title text not null,
  status text not null default 'claimed' check (status in ('claimed','sent','failed','unknown')),
  created_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  error_code text,
  unique (anniversary_id,event_date)
);
alter table public.planner_mail_deliveries enable row level security;
revoke all on public.planner_mail_deliveries from public, anon, authenticated;

-- Random scheduler credential stays in Vault; never copy it into browser code.
do $$ begin
  if not exists (select 1 from vault.secrets where name='planner_mail_cron_token') then
    perform vault.create_secret(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''), 'planner_mail_cron_token');
  end if;
end $$;

create or replace function public.planner_mail_status()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('enabled',enabled,'last_test_at',last_test_at)
  from public.planner_mail_settings where id;
$$;
revoke all on function public.planner_mail_status() from public,anon,authenticated;
grant execute on function public.planner_mail_status() to authenticated;

create or replace function public.planner_mail_authorize(p_token text)
returns boolean language sql stable security definer set search_path='' as $$
  select length(p_token) >= 32 and exists (
    select 1 from vault.decrypted_secrets where name='planner_mail_cron_token' and decrypted_secret=p_token
  );
$$;
revoke all on function public.planner_mail_authorize(text) from public,anon,authenticated;
grant execute on function public.planner_mail_authorize(text) to service_role;

create or replace function public.planner_mail_credentials()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'username',(select decrypted_secret from vault.decrypted_secrets where name='planner_qq_smtp_username'),
    'password',(select decrypted_secret from vault.decrypted_secrets where name='planner_qq_smtp_password')
  );
$$;
revoke all on function public.planner_mail_credentials() from public,anon,authenticated;
grant execute on function public.planner_mail_credentials() to service_role;

-- Only the server may claim work. The optional clock is for deterministic QA;
-- production calls omit it and use the database's current time.
create or replace function public.planner_mail_claim(p_now timestamptz default clock_timestamp())
returns table(id uuid,anniversary_id uuid,event_date date,recipient text,title text)
language plpgsql security definer set search_path='' as $$
declare
  local_now timestamp := p_now at time zone 'Asia/Singapore';
  target date := local_now::date + 1;
begin
  if local_now::time < time '09:00' or local_now::time >= time '10:00'
     or not exists (select 1 from public.planner_mail_settings s where s.id and s.enabled) then return; end if;
  return query
    insert into public.planner_mail_deliveries as d(anniversary_id,user_id,event_date,recipient,title)
    select a.id,a.user_id,target,u.email,a.title
    from public.planner_anniversaries a join auth.users u on u.id=a.user_id
    where a.email_reminder and u.email is not null and u.email_confirmed_at is not null
      and a.date <= target
      and ((a.mode='countdown' and not a.yearly and a.date=target)
        or ((a.mode='countup' or a.yearly) and
          (case when extract(month from a.date)=2 and extract(day from a.date)=29
            then make_date(extract(year from target)::int,3,1)-1
            else make_date(extract(year from target)::int,extract(month from a.date)::int,extract(day from a.date)::int)
          end)=target))
      and not exists (select 1 from public.planner_mail_deliveries x where x.anniversary_id=a.id and x.event_date=target)
    order by a.id limit 5
    on conflict on constraint planner_mail_deliveries_anniversary_id_event_date_key do nothing
    returning d.id,d.anniversary_id,d.event_date,d.recipient,d.title;
end;
$$;
revoke all on function public.planner_mail_claim(timestamptz) from public,anon,authenticated;
grant execute on function public.planner_mail_claim(timestamptz) to service_role;

-- Recheck opt-out, deletion and edits immediately before sending a claimed mail.
create or replace function public.planner_mail_still_due(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.planner_mail_deliveries d
    join public.planner_anniversaries a on a.id=d.anniversary_id
    join auth.users u on u.id=d.user_id
    join public.planner_mail_settings s on s.id
    where d.id=p_id and d.status='claimed' and a.email_reminder and s.enabled
      and u.email=d.recipient and u.email_confirmed_at is not null
      and a.updated_at <= d.created_at
  );
$$;
revoke all on function public.planner_mail_still_due(uuid) from public,anon,authenticated;
grant execute on function public.planner_mail_still_due(uuid) to service_role;

create or replace function public.planner_mail_finish(p_id uuid,p_status text,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('sent','failed','unknown') then raise exception 'Invalid delivery status'; end if;
  update public.planner_mail_deliveries set status=p_status,finished_at=clock_timestamp(),error_code=left(p_error,40)
  where id=p_id and status='claimed';
end;
$$;
revoke all on function public.planner_mail_finish(uuid,text,text) from public,anon,authenticated;
grant execute on function public.planner_mail_finish(uuid,text,text) to service_role;

create or replace function public.planner_mail_test_result(p_ok boolean,p_error text default null)
returns void language sql security definer set search_path='' as $$
  update public.planner_mail_settings set enabled=p_ok,last_test_at=clock_timestamp(),last_error=left(p_error,40) where id;
$$;
revoke all on function public.planner_mail_test_result(boolean,text) from public,anon,authenticated;
grant execute on function public.planner_mail_test_result(boolean,text) to service_role;
notify pgrst, 'reload schema';
commit;
