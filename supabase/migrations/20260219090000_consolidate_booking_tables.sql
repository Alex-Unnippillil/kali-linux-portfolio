-- Consolidate booking storage to a single canonical table.
-- Canonical source of truth: public.bookings
-- Compatibility surface: public.amenity_bookings (read-only view)

begin;

-- If older environments still have amenity_bookings as a table,
-- rename it to bookings when bookings does not already exist.
do $$
begin
  if to_regclass('public.bookings') is null
     and to_regclass('public.amenity_bookings') is not null
     and exists (
       select 1
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'amenity_bookings'
         and c.relkind = 'r'
     ) then
    execute 'alter table public.amenity_bookings rename to bookings';
  end if;
end;
$$;

-- If both objects exist and amenity_bookings is still a table,
-- keep bookings as source-of-truth and replace amenity_bookings with a view.
do $$
begin
  if to_regclass('public.bookings') is not null
     and exists (
       select 1
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'amenity_bookings'
         and c.relkind = 'r'
     ) then
    execute 'drop table public.amenity_bookings';
  end if;
end;
$$;

-- Recreate compatibility view for any legacy query paths.
drop view if exists public.amenity_bookings;
create view public.amenity_bookings as
  select * from public.bookings;

-- Harden RLS on the canonical table used by the API.
alter table if exists public.bookings enable row level security;

-- Replace old policies with canonical bookings policies.
drop policy if exists "bookings_select_own" on public.bookings;
drop policy if exists "bookings_insert_own" on public.bookings;
drop policy if exists "bookings_update_own" on public.bookings;
drop policy if exists "bookings_delete_own" on public.bookings;

create policy "bookings_select_own"
  on public.bookings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "bookings_insert_own"
  on public.bookings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "bookings_update_own"
  on public.bookings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "bookings_delete_own"
  on public.bookings
  for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
