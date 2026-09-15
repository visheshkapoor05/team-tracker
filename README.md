# Team Tracker (Local POC)

A projects/tasks/hours tracker for a small team — the local, no-accounts-needed
version of the build spec, meant to validate the workflow before committing to
any third-party service.

## What this phase is

- **Storage**: a single Excel workbook at `data/tracker.xlsx`. Every "table"
  (profiles, brands, projects, tasks, hours, leaves, holidays, comments,
  notifications) is a sheet. Reads/writes go through `src/lib/store/workbook.ts`,
  which serializes access with an in-process lock so concurrent requests don't
  corrupt the file.
- **Auth**: there isn't any. A "switch user" dropdown in the top bar lets you
  preview the app as any seeded profile (employee / lead / manager) via a
  plain cookie. Permission checks (who can edit whose tasks, who can approve
  brands, etc.) are enforced in `src/lib/store/db.ts`, but only at the
  application layer — there is no database-level enforcement yet. Don't expose
  this build to the real internet.
- **Notifications**: polling every 4s (`NotificationBell`), not realtime.

Everything else — the tracker grid, status/brand workflows, leave marking,
comment threads, resource allocation math and charts, role management — is
fully wired up and works the same way it will once this moves to a real
backend.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first request, `data/tracker.xlsx` is created
and seeded automatically with four users (one manager, one lead, two
employees), a sample project, two approved brands, and a few days of logged
hours. Use the user switcher in the top-right to try different roles.

**To reset all data**, just delete the file and reload:

```bash
rm data/tracker.xlsx
```

There's nothing else to configure — no environment variables, no accounts.

## Project layout

```
src/lib/store/        the "database": types, the xlsx read/write layer, and
                       all CRUD + business logic (notifications on comment/
                       brand events, leave-blocks-hours, etc.)
src/lib/auth.ts        mock current-user resolution (cookie-based)
src/app/api/*          route handlers the client calls (mirrors what will
                       become direct Supabase calls in Phase 2)
src/app/(app)/         the three pages: tracker, allocation, admin
src/components/        UI, grouped by page
```

## Known gaps in this phase (by design)

- Single Node process only — this will not work as-is on serverless hosting
  (Vercel's functions have an ephemeral filesystem, so writes to the xlsx file
  wouldn't persist). That's expected; see the migration plan below.
- No real password/session security — anyone who opens the app can act as
  anyone. Fine for an internal trial on one machine, not fine for the wider
  team.
- No email notifications (in-app only, per the original scope decision).

## Phase 2: moving to Supabase + Vercel

Once the workflow itself is validated, here's the intended path to a real
multi-user deployment, matching the original build spec:

1. **Schema**: the tables in `src/lib/store/types.ts` map almost 1:1 to the
   Postgres schema — `profiles`, `brands`, `projects`, `tasks`,
   `task_daily_entries`, `leaves`, `holidays`, `comments`, `notifications`.
   Write these as SQL migrations under `supabase/migrations/`.
2. **RLS policies**: re-express the checks currently in `src/lib/store/db.ts`
   (e.g. `assertCanEditTask`, `canViewAll`, the brand-approval gate) as
   Postgres Row-Level Security policies, using a `current_role()` SQL helper
   (`security definer`) to avoid recursive-policy issues on `profiles`.
3. **Auth**: replace `src/lib/auth.ts`'s cookie-based `getCurrentUser()` with
   Supabase Auth (`supabase.auth.getUser()` + a `profiles` lookup) — every
   caller of `getCurrentUser()`/`requireCurrentUser()` stays the same, since
   that was the point of keeping this layer isolated. Add a Postgres trigger
   rejecting signups whose email isn't `@easyrewardz.com`.
4. **Data layer**: swap `src/lib/store/db.ts`'s xlsx-backed functions for
   `@supabase/supabase-js` calls. The function signatures (`listVisibleTasks`,
   `updateTask`, `addComment`, etc.) can stay the same, so this is a
   call-site-only change everywhere else in the app.
5. **Realtime**: replace `NotificationBell`'s polling with a Supabase Realtime
   subscription on `notifications` filtered to `recipient_id = auth.uid()`.
6. **First manager**: after the first real signup, promote them directly in
   the Supabase SQL editor:
   ```sql
   update profiles set role = 'manager' where email = 'someone@easyrewardz.com';
   ```
7. **Deploy**: push to GitHub, connect to a free Vercel project, set
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel's
   project settings, deploy.

None of this needs to happen until the team has actually used this local
version and confirmed the workflow matches how they want to work.
