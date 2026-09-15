# Team Tracker

A projects/tasks/hours tracker for a small team (ERDS) — Supabase-backed, deployed on Vercel.

## Stack

- **Next.js 16 (App Router)** + TypeScript + Tailwind
- **Supabase**: Postgres (all data), Auth (signup restricted to `@easyrewardz.com`), Row-Level
  Security as the real enforcement layer (not just hidden UI — see `supabase/migrations/`)
- **Vercel**: hosting, auto-deploys on push to `main`

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project's URL + keys
npm run dev
```

Required env vars (from your Supabase project's Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable/anon key — safe to expose to the browser)
- `SUPABASE_SERVICE_ROLE_KEY` (secret — server-only, used for cross-user notification writes;
  never prefix this with `NEXT_PUBLIC_`)

## Database

Schema + RLS policies live in `supabase/migrations/`, applied in order:

1. `0001_schema.sql` — all tables, plus the real 2026 office holiday calendar seed data
2. `0002_auth_trigger.sql` — auto-creates a `profiles` row on signup, rejects non-`@easyrewardz.com`
   emails at the database layer (defense in depth, not just a client-side check)
3. `0003_rls.sql` — Row-Level Security policies for every table, plus `current_role()` /
   `is_manager()` / `can_view_all()` helper functions

Apply them via the Supabase SQL Editor (paste and run each file in order), or via `psql`/the
Supabase CLI if you have direct database access.

### Roles

- **employee** — own tracker only
- **lead** — can view everyone's tracker except managers', can comment on any task, read-only
  otherwise
- **manager** — full access, approves brands, assigns roles/offices, manages holidays and the
  stale-task reminder threshold

### First manager

There's no manager until you promote one. After your first real signup (through the app), run in
the Supabase SQL Editor:

```sql
update profiles set role = 'manager' where email = 'someone@easyrewardz.com';
```

## Project layout

```
supabase/migrations/    SQL schema + RLS, applied directly in the Supabase dashboard
src/lib/supabase/       browser client, server (SSR, session-aware) client, admin
                        (service-role, server-only) client, hand-written DB types
src/lib/store/db.ts     all CRUD + business logic (notifications, stale-task reminders,
                        bench calculation, leave-blocks-hours, etc.) — Supabase-backed
src/lib/auth.ts         getCurrentUser()/requireCurrentUser() via Supabase Auth session
src/app/(auth)/         login, signup
src/app/(app)/          tracker, allocation, admin — the three main pages
src/app/api/*           route handlers the client calls
src/components/         UI, grouped by page
src/proxy.ts            Supabase session-refresh (Next.js 16 renamed middleware.ts to this)
```

## Deployment (Vercel)

Connected to GitHub — every push to `main` auto-deploys. Set the same three env vars as above in
the Vercel project's Settings → Environment Variables.

After deploying, add the production URL to Supabase's Auth → URL Configuration (Site URL +
Redirect URLs), or email confirmation links will redirect to the wrong place.
