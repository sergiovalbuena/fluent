-- Study groups (/community): a small group of learners who join with an invite
-- code and see each other's streak, weekly XP and recent achievements.
--
-- Profiles stay private (RLS: own row only). Group members see each other
-- only through the security-definer functions below, which return just what
-- the page shows (no emails) and only for the caller's own group. The tables
-- have no policies: nothing is readable or writable directly.

create table if not exists public.study_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{6}$'),
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.study_group_members (
  group_id  uuid not null references public.study_groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  -- One group per learner
  unique (user_id)
);

create index if not exists study_group_members_group_idx on public.study_group_members (group_id);

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
revoke all on table public.study_groups from anon, authenticated;
revoke all on table public.study_group_members from anon, authenticated;

-- ── Helpers ───────────────────────────────────────────────────────────────────

create or replace function public.study_group_new_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O, 1/I
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.study_groups where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ── Actions ───────────────────────────────────────────────────────────────────

create or replace function public.create_study_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_group uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.study_group_members where user_id = v_user) then
    raise exception 'already_in_group';
  end if;
  insert into public.study_groups (name, invite_code, created_by)
  values (btrim(p_name), public.study_group_new_code(), v_user)
  returning id into v_group;
  insert into public.study_group_members (group_id, user_id, role) values (v_group, v_user, 'owner');
  return v_group;
end;
$$;

create or replace function public.join_study_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_group uuid;
  v_current uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select id into v_group from public.study_groups where invite_code = upper(btrim(p_code));
  if v_group is null then raise exception 'invalid_code'; end if;
  select group_id into v_current from public.study_group_members where user_id = v_user;
  if v_current = v_group then return v_group; end if;
  if v_current is not null then raise exception 'already_in_group'; end if;
  if (select count(*) from public.study_group_members where group_id = v_group) >= 12 then
    raise exception 'group_full';
  end if;
  insert into public.study_group_members (group_id, user_id) values (v_group, v_user);
  return v_group;
end;
$$;

-- Leaving as the owner hands the group to the longest-standing member; the last
-- one out deletes it.
create or replace function public.leave_study_group()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_group uuid;
  v_role text;
  v_next uuid;
begin
  select group_id, role into v_group, v_role from public.study_group_members where user_id = v_user;
  if v_group is null then return; end if;
  delete from public.study_group_members where user_id = v_user;
  if v_role = 'owner' then
    select user_id into v_next from public.study_group_members where group_id = v_group order by joined_at limit 1;
    if v_next is null then
      delete from public.study_groups where id = v_group;
    else
      update public.study_group_members set role = 'owner' where group_id = v_group and user_id = v_next;
    end if;
  end if;
end;
$$;

create or replace function public.rename_study_group(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
begin
  select group_id into v_group from public.study_group_members where user_id = auth.uid() and role = 'owner';
  if v_group is null then raise exception 'not_owner'; end if;
  update public.study_groups set name = btrim(p_name) where id = v_group;
end;
$$;

create or replace function public.remove_study_group_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
begin
  select group_id into v_group from public.study_group_members where user_id = auth.uid() and role = 'owner';
  if v_group is null then raise exception 'not_owner'; end if;
  if p_user = auth.uid() then raise exception 'cannot_remove_self'; end if;
  delete from public.study_group_members where group_id = v_group and user_id = p_user;
end;
$$;

create or replace function public.regenerate_study_group_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
  v_code text;
begin
  select group_id into v_group from public.study_group_members where user_id = auth.uid() and role = 'owner';
  if v_group is null then raise exception 'not_owner'; end if;
  v_code := public.study_group_new_code();
  update public.study_groups set invite_code = v_code where id = v_group;
  return v_code;
end;
$$;

-- ── Reads ─────────────────────────────────────────────────────────────────────

-- The caller's group and, per member: name, avatar, course, streak (0 if it has
-- lapsed), total XP, XP this week (since Monday) and on each of the last 7 days.
create or replace function public.get_study_group()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select m.group_id from public.study_group_members m where m.user_id = auth.uid()
  ),
  members as (
    select m.user_id, m.role, m.joined_at
    from public.study_group_members m join me on me.group_id = m.group_id
  )
  select jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'invite_code', g.invite_code,
    'created_at', g.created_at,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', mb.user_id,
        'role', mb.role,
        'joined_at', mb.joined_at,
        'is_me', mb.user_id = auth.uid(),
        'name', coalesce(
          nullif(btrim(p.display_name), ''),
          nullif(split_part(btrim(u.raw_user_meta_data ->> 'full_name'), ' ', 1), ''),
          'Learner'
        ),
        'avatar_url', coalesce(p.avatar_url, u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
        'language_code', (select l.language_code from public.user_languages l where l.user_id = mb.user_id and l.is_active limit 1),
        'streak', case when p.last_activity_date >= current_date - 1 then coalesce(p.streak_count, 0) else 0 end,
        'active_today', p.last_activity_date = current_date
          or exists (select 1 from public.user_activity a where a.user_id = mb.user_id and a.activity_date = current_date and a.xp_earned > 0),
        'total_xp', coalesce(p.total_xp, 0),
        'week_xp', coalesce((
          select sum(a.xp_earned) from public.user_activity a
          where a.user_id = mb.user_id and a.activity_date >= date_trunc('week', current_date)::date
        ), 0),
        'days', (
          select jsonb_agg(coalesce(a.xp_earned, 0) order by d.day)
          from generate_series(current_date - 6, current_date, interval '1 day') as d(day)
          left join public.user_activity a on a.user_id = mb.user_id and a.activity_date = d.day::date
        )
      ) order by mb.joined_at)
      from members mb
      left join public.user_profiles p on p.user_id = mb.user_id
      left join auth.users u on u.id = mb.user_id
    ), '[]'::jsonb)
  )
  from public.study_groups g
  where g.id = (select group_id from me);
$$;

-- Recent achievements in the caller's group (last 14 days): lessons practised
-- (one event per learner, lesson and day), grammar modules mastered and new
-- members.
create or replace function public.get_study_group_feed(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select m.group_id from public.study_group_members m where m.user_id = auth.uid()
  ),
  members as (
    select m.user_id, m.joined_at
    from public.study_group_members m join me on me.group_id = m.group_id
  ),
  events as (
    select up.user_id, 'lesson' as kind, max(up.completed_at) as at,
           jsonb_build_object(
             'module_title', mo.title, 'module_slug', mo.slug, 'language_code', mo.language_code,
             'activities', count(*), 'stars', max(up.stars)
           ) as data
    from public.user_progress up
    join members mb on mb.user_id = up.user_id
    join public.modules mo on mo.id = up.module_id
    where up.completed_at > now() - interval '14 days'
    group by up.user_id, mo.id, mo.title, mo.slug, mo.language_code, (up.completed_at at time zone 'utc')::date
    union all
    select gt.user_id, 'grammar_module', gt.created_at,
           jsonb_build_object('module_slug', substr(gt.ref, length('grammar-module:') + 1))
    from public.gem_transactions gt
    join members mb on mb.user_id = gt.user_id
    where gt.reason = 'bonus' and gt.ref like 'grammar-module:%' and gt.created_at > now() - interval '14 days'
    union all
    select mb.user_id, 'joined', mb.joined_at, '{}'::jsonb
    from members mb
    where mb.joined_at > now() - interval '14 days'
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', e.user_id, 'kind', e.kind, 'at', e.at, 'data', e.data) order by e.at desc), '[]'::jsonb)
  from (select * from events order by at desc limit least(greatest(p_limit, 1), 100)) e;
$$;

-- ── Permissions ───────────────────────────────────────────────────────────────

revoke execute on function public.study_group_new_code() from public, anon, authenticated;
revoke execute on function public.create_study_group(text) from public, anon;
revoke execute on function public.join_study_group(text) from public, anon;
revoke execute on function public.leave_study_group() from public, anon;
revoke execute on function public.rename_study_group(text) from public, anon;
revoke execute on function public.remove_study_group_member(uuid) from public, anon;
revoke execute on function public.regenerate_study_group_code() from public, anon;
revoke execute on function public.get_study_group() from public, anon;
revoke execute on function public.get_study_group_feed(integer) from public, anon;

grant execute on function public.create_study_group(text) to authenticated;
grant execute on function public.join_study_group(text) to authenticated;
grant execute on function public.leave_study_group() to authenticated;
grant execute on function public.rename_study_group(text) to authenticated;
grant execute on function public.remove_study_group_member(uuid) to authenticated;
grant execute on function public.regenerate_study_group_code() to authenticated;
grant execute on function public.get_study_group() to authenticated;
grant execute on function public.get_study_group_feed(integer) to authenticated;
