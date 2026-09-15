-- Row Level Security. This is the real enforcement layer — the Next.js app
-- layer duplicates some of these checks for nicer error messages, but the
-- database is what actually protects the data.

-- security definer avoids infinite-recursion issues you'd hit if a policy on
-- `profiles` tried to query `profiles` directly to check the caller's role.
create function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'manager';
$$;

create function public.can_view_all()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('manager', 'lead');
$$;

-- ---------- profiles ----------

alter table public.profiles enable row level security;

create policy profiles_select_all on public.profiles
  for select using (auth.role() = 'authenticated');

-- Anyone may update their own row (e.g. a future "edit my name" feature),
-- and managers may update anyone's — but changing role/office is blocked
-- below for non-managers regardless of which policy let the UPDATE through.
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id);

create policy profiles_update_by_manager on public.profiles
  for update using (public.is_manager());

create function public.prevent_unauthorized_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.office_id is distinct from old.office_id)
     and not public.is_manager() then
    raise exception 'Only managers can change role or office assignment';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_unauthorized_profile_changes
  before update on public.profiles
  for each row execute function public.prevent_unauthorized_profile_changes();

-- ---------- offices ----------

alter table public.offices enable row level security;

create policy offices_select_all on public.offices
  for select using (auth.role() = 'authenticated');

create policy offices_write_manager on public.offices
  for all using (public.is_manager()) with check (public.is_manager());

-- ---------- brands ----------

alter table public.brands enable row level security;

create policy brands_select_all on public.brands
  for select using (auth.role() = 'authenticated');

-- Anyone can request a brand (status pending); only a manager may insert one
-- pre-approved (the "add directly" admin flow).
create policy brands_insert on public.brands
  for insert with check (
    requested_by = auth.uid()
    and (status = 'pending' or public.is_manager())
  );

create policy brands_update_manager on public.brands
  for update using (public.is_manager());

create policy brands_delete_manager on public.brands
  for delete using (public.is_manager());

-- ---------- projects ----------

alter table public.projects enable row level security;

create policy projects_select_all on public.projects
  for select using (auth.role() = 'authenticated');

create policy projects_insert_any on public.projects
  for insert with check (created_by = auth.uid());

create policy projects_update_manager on public.projects
  for update using (public.is_manager());

create policy projects_delete_manager on public.projects
  for delete using (public.is_manager());

-- ---------- tasks ----------

alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select using (owner_id = auth.uid() or public.can_view_all());

create policy tasks_insert on public.tasks
  for insert with check (owner_id = auth.uid() or public.is_manager());

create policy tasks_update on public.tasks
  for update using (owner_id = auth.uid() or public.is_manager());

create policy tasks_delete on public.tasks
  for delete using (owner_id = auth.uid() or public.is_manager());

-- ---------- task_daily_entries ----------

alter table public.task_daily_entries enable row level security;

create policy entries_select on public.task_daily_entries
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and (t.owner_id = auth.uid() or public.can_view_all())
    )
  );

create policy entries_write on public.task_daily_entries
  for all using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and (t.owner_id = auth.uid() or public.is_manager())
    )
  ) with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and (t.owner_id = auth.uid() or public.is_manager())
    )
  );

-- ---------- leaves ----------

alter table public.leaves enable row level security;

create policy leaves_select on public.leaves
  for select using (profile_id = auth.uid() or public.can_view_all());

create policy leaves_write on public.leaves
  for all using (profile_id = auth.uid() or public.is_manager())
  with check (profile_id = auth.uid() or public.is_manager());

-- ---------- holidays ----------

alter table public.holidays enable row level security;

create policy holidays_select_all on public.holidays
  for select using (auth.role() = 'authenticated');

create policy holidays_write_manager on public.holidays
  for all using (public.is_manager()) with check (public.is_manager());

-- ---------- comments ----------

alter table public.comments enable row level security;

create policy comments_select on public.comments
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and (t.owner_id = auth.uid() or public.can_view_all())
    )
  );

create policy comments_insert on public.comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and (t.owner_id = auth.uid() or public.can_view_all())
    )
  );

-- ---------- notifications ----------
-- No insert policy for regular users: notifications are always written by
-- server-side code using the service-role key (see src/lib/store/db.ts),
-- since a comment/reminder notification is addressed to someone other than
-- the acting user. Regular users may only read and mark their own as read.

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (recipient_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update using (recipient_id = auth.uid());

-- ---------- org_settings ----------

alter table public.org_settings enable row level security;

create policy org_settings_select_all on public.org_settings
  for select using (auth.role() = 'authenticated');

create policy org_settings_update_manager on public.org_settings
  for update using (public.is_manager());
