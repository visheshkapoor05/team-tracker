-- One-time cleanup: several brands exist more than once under the same
-- name (case/whitespace-insensitively) — e.g. "Bata" x3, "LOG (External)/
-- Bell capex" x3 — because nothing ever stopped a second person (or the
-- same person later) from requesting a name that already existed. For each
-- group of same-named brands, keep one canonical row (prefer an approved
-- one, then the oldest) and repoint any tasks using the others onto it
-- before dropping the duplicates — tasks.brand_id is "on delete restrict",
-- so deleting them first (as the UI already found) fails instead.
begin;

with canonical as (
  select distinct on (lower(trim(name)))
    id as canonical_id,
    lower(trim(name)) as name_key
  from public.brands
  order by lower(trim(name)), (status = 'approved') desc, created_at asc
),
duplicates as (
  select b.id, c.canonical_id
  from public.brands b
  join canonical c on c.name_key = lower(trim(b.name))
  where b.id <> c.canonical_id
)
update public.tasks t
set brand_id = d.canonical_id
from duplicates d
where t.brand_id = d.id;

with canonical as (
  select distinct on (lower(trim(name)))
    id as canonical_id,
    lower(trim(name)) as name_key
  from public.brands
  order by lower(trim(name)), (status = 'approved') desc, created_at asc
),
duplicates as (
  select b.id
  from public.brands b
  join canonical c on c.name_key = lower(trim(b.name))
  where b.id <> c.canonical_id
)
delete from public.brands b
using duplicates d
where b.id = d.id;

commit;

-- Enforce this going forward at the database level, as a backstop behind
-- the app-level check (findBrandByName in db.ts) in case of a race.
create unique index if not exists brands_unique_name_ci
  on public.brands (lower(trim(name)));
