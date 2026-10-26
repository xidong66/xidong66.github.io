begin;
alter table public.planner_projects add column is_archived boolean not null default false;
alter table public.planner_projects drop constraint planner_projects_status_check;
-- Legacy archive was the only recorded status. Retain its archive meaning,
-- without inventing a progress/completion state for these projects.
update public.planner_projects set is_archived=true,status='unspecified' where status='archived';
alter table public.planner_projects add constraint planner_projects_status_check
check (status in ('waiting','planned','in_progress','completed','failed','unspecified'));
notify pgrst, 'reload schema';
commit;
