-- Run only in an empty disposable database, as a superuser. See sql/README.md.
\set ON_ERROR_STOP on
begin;

-- Fail rather than touching a real table or reusing existing roles.
create table public.floorplan_annotations (id integer primary key, owner_id text);
create role floorplan_test_anon nologin nosuperuser nobypassrls;
create role floorplan_test_authenticated nologin nosuperuser nobypassrls;
create role floorplan_test_service nologin nosuperuser bypassrls;
grant usage on schema public to floorplan_test_anon, floorplan_test_authenticated,
  floorplan_test_service;
grant select, insert, update, delete on public.floorplan_annotations
  to floorplan_test_anon, floorplan_test_authenticated, floorplan_test_service;
insert into public.floorplan_annotations values (1, 'alice'), (2, 'bob');

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then
    raise exception 'FAIL: %', message;
  end if;
end;
$$;

-- The baseline is actually exposed through table grants before the patch.
set local role floorplan_test_anon;
select pg_temp.assert_true(count(*) = 2, 'baseline exposes rows before RLS')
from public.floorplan_annotations;
reset role;

create temporary table original_grants as
  select relacl from pg_class where oid = 'public.floorplan_annotations'::regclass;

\ir ../floorplan_annotations_rls.sql
\ir ../floorplan_annotations_rls.sql

select pg_temp.assert_true(relrowsecurity and not relforcerowsecurity,
  'RLS is enabled without forcing owner enforcement')
from pg_class where oid = 'public.floorplan_annotations'::regclass;
select pg_temp.assert_true(count(*) = 0, 'the patch does not invent policies')
from pg_policies where schemaname = 'public' and tablename = 'floorplan_annotations';
select pg_temp.assert_true(c.relacl is not distinct from g.relacl, 'grants are unchanged')
from pg_class c cross join original_grants g
where c.oid = 'public.floorplan_annotations'::regclass;

-- SECURITY INVOKER is the default: all statements use the current test role.
create function pg_temp.assert_default_deny() returns void language plpgsql as $$
declare affected integer;
begin
  perform pg_temp.assert_true((select count(*) = 0 from public.floorplan_annotations),
    'ordinary role cannot read rows without a policy');
  begin
    insert into public.floorplan_annotations values (3, 'mallory');
    raise exception 'FAIL: ordinary role inserted a row without a policy';
  exception when insufficient_privilege then null;
  end;
  update public.floorplan_annotations set owner_id = 'mallory';
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = 0, 'ordinary role cannot update rows');
  delete from public.floorplan_annotations;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = 0, 'ordinary role cannot delete rows');
end;
$$;

set local role floorplan_test_anon;
select pg_temp.assert_default_deny();
reset role;
set local role floorplan_test_authenticated;
select pg_temp.assert_default_deny();
reset role;

-- Server-side BYPASSRLS access remains available for every CRUD operation.
set local role floorplan_test_service;
select pg_temp.assert_true(count(*) = 2, 'service role reads all rows')
from public.floorplan_annotations;
insert into public.floorplan_annotations values (3, 'service');
with updated as (
  update public.floorplan_annotations set owner_id = 'updated' where id = 3 returning id
)
select pg_temp.assert_true(count(*) = 1, 'service role updates rows') from updated;
with deleted as (delete from public.floorplan_annotations where id = 3 returning id)
select pg_temp.assert_true(count(*) = 1, 'service role deletes rows') from deleted;
reset role;

-- Simulate an existing restricted policy on a table whose RLS was disabled.
alter table public.floorplan_annotations disable row level security;
create policy existing_owner_policy on public.floorplan_annotations
  to floorplan_test_authenticated
  using (owner_id = current_setting('request.jwt.claim.sub', true))
  with check (owner_id = current_setting('request.jwt.claim.sub', true));
create temporary table original_policies as
  select * from pg_policies
  where schemaname = 'public' and tablename = 'floorplan_annotations';

\ir ../floorplan_annotations_rls.sql
\ir ../floorplan_annotations_rls.sql

select pg_temp.assert_true(not exists (
  (select * from original_policies except select * from pg_policies)
  union all
  (select * from pg_policies where schemaname = 'public' and tablename = 'floorplan_annotations'
   except select * from original_policies)
), 'existing policies are unchanged');

set local role floorplan_test_anon;
select pg_temp.assert_default_deny();
reset role;
set local role floorplan_test_authenticated;
select set_config('request.jwt.claim.sub', 'alice', true);
select pg_temp.assert_true(count(*) = 1 and min(owner_id) = 'alice',
  'existing policy restricts reads to the owner') from public.floorplan_annotations;
insert into public.floorplan_annotations values (4, 'alice');
do $$
begin
  begin
    insert into public.floorplan_annotations values (5, 'bob');
    raise exception 'FAIL: existing policy allowed another owner on insert';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.floorplan_annotations set owner_id = 'bob' where id = 4;
    raise exception 'FAIL: existing policy allowed transferring ownership';
  exception when insufficient_privilege then null;
  end;
end;
$$;
with updated as (
  update public.floorplan_annotations set owner_id = 'alice' where id = 4 returning id
)
select pg_temp.assert_true(count(*) = 1, 'existing policy allows own-row updates') from updated;
with updated as (
  update public.floorplan_annotations set owner_id = 'alice' where id = 2 returning id
)
select pg_temp.assert_true(count(*) = 0, 'existing policy blocks other-row updates') from updated;
with deleted as (delete from public.floorplan_annotations where id = 2 returning id)
select pg_temp.assert_true(count(*) = 0, 'existing policy blocks other-row deletes') from deleted;
with deleted as (delete from public.floorplan_annotations where id = 4 returning id)
select pg_temp.assert_true(count(*) = 1, 'existing policy allows own-row deletes') from deleted;
reset role;

select pg_temp.assert_true(count(*) = 2 and bool_and(
  (id = 1 and owner_id = 'alice') or (id = 2 and owner_id = 'bob')
), 'original data is unchanged') from public.floorplan_annotations;
rollback;
select 'PASS: floorplan_annotations RLS regression tests' as result;
