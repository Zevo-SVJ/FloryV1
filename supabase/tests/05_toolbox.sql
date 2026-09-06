-- The Toolbox, tested.
--
-- Two things matter here. The Toolbox is platform content, so no learner may
-- write it at any privilege level. And what a learner adds — saves, ticks,
-- recents — is theirs alone, including from staff: this is working behaviour,
-- not submitted work.

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

create or replace function pg_temp.ok(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label; end if;
end;
$$;

create or replace function pg_temp.denied(statement text, label text)
returns void language plpgsql as $$
declare affected bigint;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when others then
    raise notice 'PASS  % [refused: %]', label, sqlerrm; return;
  end;
  if affected = 0 then raise notice 'PASS  % [no rows]', label;
  else raise exception 'FAIL  % [% row(s)]', label, affected; end if;
end;
$$;

create or replace function pg_temp.claims(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id::text)::text, false);
end;
$$;

\set david  '11111111-1111-1111-1111-111111111111'
\set other  '22222222-2222-2222-2222-222222222222'
\set mentor '33333333-3333-3333-3333-333333333333'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'david',  'david@example.com',  '{"display_name":"David"}'::jsonb),
  (:'other',  'other@example.com',  '{}'::jsonb),
  (:'mentor', 'mentor@example.com', '{}'::jsonb);
update public.profiles set role = 'mentor' where id = :'mentor';

-- An unpublished draft, to check the gate.
insert into public.toolbox_items (kind, slug, title, summary, status)
values ('prompt', 'unpublished-prompt', 'Draft', 'A draft nobody has published yet.', 'draft');

-- ── The seed ────────────────────────────────────────────────────────────────

select pg_temp.ok(
  (select count(*) from public.toolbox_items where published) = 18,
  'eighteen published items — a curated set, not a dump'
);
select pg_temp.ok(
  (select count(*) from public.toolbox_items where is_demo) = 0,
  'and none of them is a demonstration of one'
);
select pg_temp.ok(
  (select count(distinct kind) from public.toolbox_items where published) = 6,
  'all six kinds are represented'
);
select pg_temp.ok(
  (select count(*) from public.mission_toolbox_items) > 0
    and (select count(distinct mission_id) from public.mission_toolbox_items) > 5,
  'missions across the programme surface their own tools'
);
select pg_temp.ok(
  (select count(*) from public.lesson_toolbox_items) > 0,
  'so do the lessons that hand one to you'
);

-- ── Search ──────────────────────────────────────────────────────────────────

select pg_temp.ok(
  (select count(*) from public.toolbox_items
    where search @@ websearch_to_tsquery('english', 'validation')) >= 3,
  'searching for validation crosses several kinds'
);
-- Tags are filtered, not searched. Both paths have to work.
select pg_temp.ok(
  (select count(*) from public.toolbox_items where 'claude-code' = any(tags)) >= 2,
  'tags filter rather than feed the relevance ranking'
);
select pg_temp.ok(
  (select slug from public.toolbox_items
    where search @@ websearch_to_tsquery('english', 'evidence ladder')
    order by ts_rank(search, websearch_to_tsquery('english', 'evidence ladder')) desc
    limit 1) = 'evidence-quality-ladder',
  'a title match outranks a body mention'
);
select pg_temp.ok(
  (select count(*) from public.toolbox_items
    where search @@ websearch_to_tsquery('english', 'zzzznotathing')) = 0,
  'a search for nothing finds nothing rather than everything'
);

-- ── Platform content is read-only ───────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

select pg_temp.ok(
  (select count(*) from public.toolbox_items) = 18
    and (select count(*) from public.toolbox_items where slug = 'unpublished-prompt') = 0,
  'a learner sees published items and not drafts'
);
select pg_temp.denied(
  'update public.toolbox_items set title = ''owned'' where slug = ''idea-brief''',
  'a learner cannot edit platform content'
);
select pg_temp.denied(
  'insert into public.toolbox_items (kind, slug, title, summary) values ' ||
  '(''prompt'', ''forged'', ''Forged'', ''Something long enough to pass.'')',
  'nor author it'
);
select pg_temp.denied(
  'delete from public.toolbox_items where slug = ''idea-brief''',
  'nor delete it'
);
select pg_temp.denied(
  'insert into public.mission_toolbox_items (mission_id, item_id) values ' ||
  '(''00000000-0000-4000-8000-000000000100'', (select id from public.toolbox_items limit 1))',
  'nor rewire which tools a mission surfaces'
);

-- ── What a learner adds is theirs ───────────────────────────────────────────

insert into public.learner_saved_items (profile_id, item_id)
select :'david', id from public.toolbox_items where slug = 'pressure-test-an-idea';

select pg_temp.ok(
  (select count(*) from public.learner_saved_items) = 1,
  'a learner saves an item'
);
select pg_temp.denied(
  format('insert into public.learner_saved_items (profile_id, item_id) select %L, id ' ||
         'from public.toolbox_items where slug = ''idea-brief''', :'other'),
  'and cannot save on somebody else''s behalf'
);

insert into public.learner_checklist_progress (profile_id, item_id, checked_ids)
select :'david', id, array['p1','p2'] from public.toolbox_items where slug = 'before-you-write-code';

update public.learner_checklist_progress set checked_ids = array['p1','p2','e1'];
select pg_temp.ok(
  (select array_length(checked_ids, 1) from public.learner_checklist_progress) = 3,
  'and ticks their own boxes'
);

insert into public.learner_recent_items (profile_id, item_id)
select :'david', id from public.toolbox_items where slug = 'problem-user-evidence';
select pg_temp.ok(
  (select count(*) from public.learner_recent_items) = 1,
  'and their recent views are recorded'
);

delete from public.learner_saved_items;
select pg_temp.ok(
  (select count(*) from public.learner_saved_items) = 0,
  'and unsaved again'
);

reset role;

-- ── Isolation, including from staff ─────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'other');

select pg_temp.ok((select count(*) from public.learner_checklist_progress) = 0,
  'another learner sees none of David''s checklist state');
select pg_temp.ok((select count(*) from public.learner_recent_items) = 0,
  'nor what he has been reading');
select pg_temp.denied(
  'update public.learner_checklist_progress set checked_ids = ''{}''',
  'nor reset his checklist'
);

reset role;

set role authenticated;
select pg_temp.claims(:'mentor');

select pg_temp.ok(
  (select count(*) from public.toolbox_items where slug = 'unpublished-prompt') = 1,
  'staff see unpublished toolbox drafts');
select pg_temp.denied(
  'update public.toolbox_items set title = ''edited'' where slug = ''idea-brief''',
  'but staff cannot edit content either — authoring is SQL, and Prompt 6 decides otherwise'
);
select pg_temp.ok((select count(*) from public.learner_checklist_progress) = 0,
  'a mentor does not see which boxes a learner ticked — that is working behaviour, not submitted work');
select pg_temp.ok((select count(*) from public.learner_saved_items) = 0,
  'nor what they bookmarked');

reset role;

-- ── Constraints ─────────────────────────────────────────────────────────────

select pg_temp.denied(
  'insert into public.toolbox_items (kind, slug, title, summary, body) values ' ||
  '(''checklist'', ''bad-checklist'', ''Bad'', ''A checklist whose items have no ids at all.'', ' ||
  '''{"groups":[{"title":"G","items":[{"label":"no id"}]}]}''::jsonb)',
  'a checklist item with no id is refused, because ticks are keyed on it'
);
select pg_temp.denied(
  'insert into public.toolbox_items (kind, slug, title, summary) values ' ||
  '(''prompt'', ''too-terse'', ''X'', ''short'')',
  'a summary that explains nothing is refused'
);
select pg_temp.denied(
  'insert into public.toolbox_item_links select id, id from public.toolbox_items limit 1',
  'an item cannot be related to itself'
);

select pg_temp.ok(true, '── toolbox suite complete ──');
