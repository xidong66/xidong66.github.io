-- Run after planner-email-upgrade.sql and deploying planner-email-reminders.
-- Creates the scheduler but does not send mail or enable the service.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.planner_invoke_mail(p_action text default 'run')
returns bigint language plpgsql security definer set search_path='' as $$
declare token text;
begin
  if p_action not in ('run','test') then raise exception 'Invalid action'; end if;
  if p_action='run' and not exists(select 1 from public.planner_mail_settings where id and enabled) then return null; end if;
  select decrypted_secret into token from vault.decrypted_secrets where name='planner_mail_cron_token';
  if token is null then raise exception 'Scheduler credential missing'; end if;
  return net.http_post(
    url:='https://ruyumygtmkxtpwyrnhjb.supabase.co/functions/v1/planner-email-reminders',
    headers:=jsonb_build_object('Content-Type','application/json','x-planner-mail-token',token),
    body:=jsonb_build_object('action',p_action),timeout_milliseconds:=120000
  );
end;
$$;
revoke all on function public.planner_invoke_mail(text) from public,anon,authenticated,service_role;

-- UTC 01:00 is 09:00 in Singapore/Beijing. Minute checks drain a small backlog;
-- the delivery ledger prevents repeated sends for the same anniversary/date.
do $$ begin
  perform cron.schedule('planner-anniversary-email','* 1 * * *','select public.planner_invoke_mail();');
end $$;
commit;
