-- Team Tracker — core schema
-- Mirrors src/lib/store/types.ts exactly so the Supabase-backed app matches
-- the behavior already built and tested against the local Excel-backed POC.

create extension if not exists "pgcrypto";

-- ---------- Offices ----------

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- Profiles ----------
-- One row per auth.users row, created automatically by the handle_new_user
-- trigger in 0002_auth_trigger.sql — never inserted directly by clients.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'employee' check (role in ('employee', 'lead', 'manager')),
  office_id uuid references public.offices (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Brands ----------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid not null references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Projects ----------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Tasks ----------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id),
  name text not null,
  status text not null default 'to_do' check (status in ('to_do', 'in_progress', 'hold', 'done')),
  brand_id uuid not null references public.brands (id) on delete restrict,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now()
);

create index tasks_owner_id_idx on public.tasks (owner_id);
create index tasks_project_id_idx on public.tasks (project_id);

-- ---------- Task daily entries (hours) ----------

create table public.task_daily_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  entry_date date not null,
  hours numeric not null check (hours > 0 and hours <= 24),
  created_at timestamptz not null default now(),
  unique (task_id, entry_date)
);

-- ---------- Leaves ----------

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  leave_date date not null,
  hours numeric not null default 8,
  created_at timestamptz not null default now(),
  unique (profile_id, leave_date)
);

-- ---------- Holidays (per office) ----------

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  holiday_date date not null,
  label text not null,
  -- Nullable: the initial 2026 calendar is system-seeded before any profile
  -- exists. Holidays added later from Admin will have a real creator.
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (office_id, holiday_date)
);

-- ---------- Comments ----------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_task_id_idx on public.comments (task_id);

-- ---------- Notifications ----------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_idx on public.notifications (recipient_id);

-- ---------- Org settings (single row) ----------

create table public.org_settings (
  id uuid primary key default gen_random_uuid(),
  stale_task_reminder_days integer not null default 10 check (stale_task_reminder_days >= 1)
);

insert into public.org_settings (stale_task_reminder_days) values (10);

-- ---------- Seed offices + 2026 holiday calendar ----------
-- Same real data seeded in the local POC. Fully editable afterward from Admin.

do $$
declare
  gurgaon_id uuid;
  mumbai_id uuid;
  kolkata_id uuid;
  bengaluru_id uuid;
begin
  insert into public.offices (name) values ('Gurgaon') returning id into gurgaon_id;
  insert into public.offices (name) values ('Mumbai') returning id into mumbai_id;
  insert into public.offices (name) values ('Kolkata') returning id into kolkata_id;
  insert into public.offices (name) values ('Bengaluru') returning id into bengaluru_id;

  insert into public.holidays (office_id, holiday_date, label) values
    (gurgaon_id, '2026-01-01', 'New Year'),
    (mumbai_id, '2026-01-01', 'New Year'),
    (kolkata_id, '2026-01-01', 'New Year'),
    (bengaluru_id, '2026-01-01', 'New Year'),

    (gurgaon_id, '2026-01-26', 'Republic Day'),
    (mumbai_id, '2026-01-26', 'Republic Day'),
    (kolkata_id, '2026-01-26', 'Republic Day'),
    (bengaluru_id, '2026-01-26', 'Republic Day'),

    (gurgaon_id, '2026-03-04', 'Holi'),
    (mumbai_id, '2026-03-04', 'Holi'),
    (kolkata_id, '2026-03-04', 'Holi'),
    (bengaluru_id, '2026-03-04', 'Holi'),

    (gurgaon_id, '2026-04-03', 'Good Friday'),
    (mumbai_id, '2026-04-03', 'Good Friday'),
    (kolkata_id, '2026-04-03', 'Good Friday'),
    (bengaluru_id, '2026-04-03', 'Good Friday'),

    (mumbai_id, '2026-05-01', 'Maharashtra Day / May Day'),
    (bengaluru_id, '2026-05-01', 'Maharashtra Day / May Day'),

    (gurgaon_id, '2026-05-27', 'Id-ul-Zuha (Bakrid)'),
    (kolkata_id, '2026-05-27', 'Id-ul-Zuha (Bakrid)'),
    (bengaluru_id, '2026-05-27', 'Id-ul-Zuha (Bakrid)'),

    (gurgaon_id, '2026-08-28', 'Raksha Bandhan'),
    (mumbai_id, '2026-08-28', 'Raksha Bandhan'),

    (mumbai_id, '2026-09-04', 'Janmashtami (Vaishnava)'),

    (mumbai_id, '2026-09-14', 'Ganesh Chaturthi'),
    (bengaluru_id, '2026-09-14', 'Ganesh Chaturthi'),

    (gurgaon_id, '2026-10-02', 'Mahatma Gandhi''s Birthday'),
    (mumbai_id, '2026-10-02', 'Mahatma Gandhi''s Birthday'),
    (kolkata_id, '2026-10-02', 'Mahatma Gandhi''s Birthday'),
    (bengaluru_id, '2026-10-02', 'Mahatma Gandhi''s Birthday'),

    (kolkata_id, '2026-10-19', 'Durga Pooja'),

    (gurgaon_id, '2026-10-20', 'Dussehra'),
    (mumbai_id, '2026-10-20', 'Dussehra'),
    (kolkata_id, '2026-10-20', 'Dussehra'),
    (bengaluru_id, '2026-10-20', 'Dussehra'),

    (gurgaon_id, '2026-11-09', 'Diwali (Deepavali)'),
    (mumbai_id, '2026-11-09', 'Diwali (Deepavali)'),
    (kolkata_id, '2026-11-09', 'Diwali (Deepavali)'),
    (bengaluru_id, '2026-11-09', 'Diwali (Deepavali)'),

    (gurgaon_id, '2026-11-24', 'Guru Nanak''s Birthday'),

    (gurgaon_id, '2026-12-25', 'Christmas Day'),
    (mumbai_id, '2026-12-25', 'Christmas Day'),
    (kolkata_id, '2026-12-25', 'Christmas Day'),
    (bengaluru_id, '2026-12-25', 'Christmas Day'),

    (gurgaon_id, '2026-12-31', 'New Year''s Eve'),
    (mumbai_id, '2026-12-31', 'New Year''s Eve'),
    (kolkata_id, '2026-12-31', 'New Year''s Eve'),
    (bengaluru_id, '2026-12-31', 'New Year''s Eve');
end $$;
