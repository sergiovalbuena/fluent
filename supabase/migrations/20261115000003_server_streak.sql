-- The streak moves from the browser to the database, and "today" becomes the
-- learner's local day instead of the UTC day.
--
-- Before: the client computed the streak and wrote streak_count, longest_streak,
-- last_activity_date and last_streak_milestone itself (any value could be sent),
-- and days were UTC: in the Americas an evening session counted for the next day,
-- so someone who studied every evening could lose the streak without missing a day.
--
--   * user_profiles.timezone: the learner's IANA time zone, sent by the browser
--     with each activity (it follows them when they travel).
--   * record_activity(p_tz): the only way to move the streak. Uses a streak freeze
--     when exactly one day was missed, and credits the 3 / 7 / 14-day bonus XP.
--   * add_xp files the XP under the learner's local day (same signature).
--   * protect_streak: client roles can no longer write the streak columns.

alter table public.user_profiles
  add column if not exists timezone text;

-- p_tz when it is a time zone Postgres knows, else the stored one, else UTC
create or replace function public.resolve_timezone(p_tz text, p_stored text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select name from pg_catalog.pg_timezone_names where name = p_tz),
    (select name from pg_catalog.pg_timezone_names where name = p_stored),
    'UTC'
  );
$$;

revoke all on function public.resolve_timezone(text, text) from public, anon, authenticated;

-- Registers activity for the learner's local day and moves the streak.
-- Returns { streak, new_day, frozen, milestone_xp }:
--   new_day       first activity of the local day (the streak moved)
--   frozen        a streak freeze was spent to cover one missed day
--   milestone_xp  bonus XP already credited for reaching 3, 7 or 14 days
create or replace function public.record_activity(p_tz text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.user_profiles%rowtype;
  v_tz        text;
  v_today     date;
  v_gap       integer;
  v_prev      integer;
  v_streak    integer;
  v_continues boolean := false;
  v_frozen    boolean := false;
  v_basis     integer;
  v_milestone integer;
  v_bonus     integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_profile from public.user_profiles where user_id = v_uid for update;
  if not found then
    return jsonb_build_object('streak', 0, 'new_day', false, 'frozen', false, 'milestone_xp', 0);
  end if;

  v_tz    := public.resolve_timezone(p_tz, v_profile.timezone);
  v_today := (now() at time zone v_tz)::date;
  v_prev  := coalesce(v_profile.streak_count, 0);

  -- Already counted today (or the last day on record is ahead of the local day:
  -- dates saved in UTC before this change, or a trip west)
  if v_profile.last_activity_date is not null and v_profile.last_activity_date >= v_today then
    if v_profile.timezone is distinct from v_tz then
      update public.user_profiles set timezone = v_tz where user_id = v_uid;
    end if;
    return jsonb_build_object('streak', v_prev, 'new_day', false, 'frozen', false, 'milestone_xp', 0);
  end if;

  v_gap := v_today - v_profile.last_activity_date;   -- null on the first activity ever
  if v_gap = 1 then
    v_continues := true;
  elsif v_gap = 2 and coalesce(v_profile.streak_freezes, 0) > 0 then
    v_continues := true;
    v_frozen := true;
  end if;

  v_streak := case when v_continues or v_prev = 0 then v_prev + 1 else 1 end;

  -- Milestone bonuses are paid once per streak; a broken streak starts over
  v_basis := case when not v_continues and v_prev > 0 then 0 else coalesce(v_profile.last_streak_milestone, 0) end;
  v_milestone := v_basis;
  if v_streak >= 14 and v_basis < 14 then
    v_bonus := 50; v_milestone := 14;
  elsif v_streak >= 7 and v_basis < 7 then
    v_bonus := 20; v_milestone := 7;
  elsif v_streak >= 3 and v_basis < 3 then
    v_bonus := 10; v_milestone := 3;
  end if;

  update public.user_profiles
     set streak_count          = v_streak,
         longest_streak        = greatest(v_streak, coalesce(longest_streak, 0)),
         last_activity_date    = v_today,
         last_streak_milestone = v_milestone,
         streak_freezes        = streak_freezes - (case when v_frozen then 1 else 0 end),
         timezone              = v_tz,
         total_xp              = total_xp + v_bonus
   where user_id = v_uid;

  insert into public.user_activity (user_id, activity_date, xp_earned, lessons_completed)
  values (v_uid, v_today, v_bonus, 0)
  on conflict (user_id, activity_date) do update
    set xp_earned = coalesce(public.user_activity.xp_earned, 0) + excluded.xp_earned;

  return jsonb_build_object('streak', v_streak, 'new_day', true, 'frozen', v_frozen, 'milestone_xp', v_bonus);
end;
$$;

revoke all on function public.record_activity(text) from public, anon;
grant execute on function public.record_activity(text) to authenticated;

-- add_xp: same as before (20261102000001_add_xp.sql), but the XP is filed under
-- the learner's local day (the time zone record_activity stored; UTC until then).
create or replace function public.add_xp(p_xp integer, p_lessons integer default 0)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_day   date;
  v_total integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- Largest legitimate award: a lesson with a 2× boost (90)
  if p_xp is null or p_xp < 0 or p_xp > 200 then
    raise exception 'invalid_xp';
  end if;
  if p_lessons is null or p_lessons < 0 or p_lessons > 1 then
    raise exception 'invalid_lessons';
  end if;

  select (now() at time zone public.resolve_timezone(null, timezone))::date, total_xp
    into v_day, v_total
    from public.user_profiles where user_id = v_uid;
  v_day := coalesce(v_day, (now() at time zone 'utc')::date);

  if p_xp > 0 then
    update public.user_profiles
       set total_xp = total_xp + p_xp
     where user_id = v_uid
    returning total_xp into v_total;
  end if;

  if p_xp > 0 or p_lessons > 0 then
    insert into public.user_activity (user_id, activity_date, xp_earned, lessons_completed)
    values (v_uid, v_day, p_xp, p_lessons)
    on conflict (user_id, activity_date) do update
      set xp_earned         = coalesce(public.user_activity.xp_earned, 0) + excluded.xp_earned,
          lessons_completed = coalesce(public.user_activity.lessons_completed, 0) + excluded.lessons_completed;
  end if;

  return coalesce(v_total, 0);
end;
$$;

revoke all on function public.add_xp(integer, integer) from public, anon;
grant execute on function public.add_xp(integer, integer) to authenticated;

-- The streak can only change through record_activity. Same pattern as protect_xp:
-- for client roles the protected columns keep their old value (defaults on insert).
create or replace function public.protect_streak()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.streak_count := 0;
      new.longest_streak := 0;
      new.last_activity_date := null;
      new.last_streak_milestone := 0;
    else
      new.streak_count := old.streak_count;
      new.longest_streak := old.longest_streak;
      new.last_activity_date := old.last_activity_date;
      new.last_streak_milestone := old.last_streak_milestone;
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger user_profiles_protect_streak
  before insert or update on public.user_profiles
  for each row execute function public.protect_streak();
