-- Half-day leave: a leave row can now represent half a day instead of a
-- full one. Full-day leaves keep blocking task hour entry; half-day leaves
-- leave the hour inputs open (see setTaskHours in db.ts).
alter table public.leaves add column if not exists is_half_day boolean not null default false;

-- Projects are employee-level, same as tasks: each project belongs to
-- whichever employee's tracker it was created in (created_by), and is only
-- visible to that employee plus managers/leads (public.can_view_all()) —
-- previously every project was visible to everyone regardless of owner.
drop policy if exists projects_select_all on public.projects;
create policy projects_select on public.projects
  for select using (created_by = auth.uid() or public.can_view_all());

drop policy if exists projects_insert_any on public.projects;
create policy projects_insert on public.projects
  for insert with check (created_by = auth.uid() or public.is_manager());
