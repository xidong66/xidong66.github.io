begin;
create table public.planner_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  status text not null default 'waiting' check (status in ('waiting','planned','in_progress','completed','failed','archived')),
  collaborators text[] not null default '{}' check (
    cardinality(collaborators) <= 50 and coalesce(array_ndims(collaborators),1) = 1
    and array_position(collaborators,null) is null and array_position(collaborators,'') is null
    and char_length(array_to_string(collaborators,',')) <= 4096
  ),
  output text not null default '' check (char_length(output) <= 1000),
  reflection text not null default '' check (char_length(reflection) <= 5000),
  findings text not null default '' check (char_length(findings) <= 5000),
  notes text not null default '' check (char_length(notes) <= 10000),
  sort_order integer not null default 0 check (sort_order between 0 and 1000000000),
  source_key text check (char_length(source_key) <= 200),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(user_id, source_key)
);
create index planner_projects_user_order_idx on public.planner_projects(user_id,sort_order,id);
create trigger planner_projects_touch before update on public.planner_projects
for each row execute function public.planner_touch_updated_at();
alter table public.planner_projects enable row level security;
revoke all on public.planner_projects from public,anon,authenticated;
grant select,insert,update,delete on public.planner_projects to authenticated;
create policy projects_select on public.planner_projects for select to authenticated using ((select auth.uid())=user_id);
create policy projects_insert on public.planner_projects for insert to authenticated with check ((select auth.uid())=user_id);
create policy projects_update on public.planner_projects for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy projects_delete on public.planner_projects for delete to authenticated using ((select auth.uid())=user_id);
do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.planner_projects;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
