-- Atomic XP. Every place that grants XP (lesson player, mini-games, verbs,
-- vocabulary, grammar, words mastered) used to read total_xp / xp_earned, add in
-- the browser and write back, so two awards at the same time lost one of them.
-- add_xp adds in a single statement per table. Streak logic stays in the client
-- (concurrent runs compute the same value).
--
-- p_xp       XP to add to user_profiles.total_xp and today's user_activity.xp_earned
-- p_lessons  lesson activities to add to today's user_activity.lessons_completed (0 or 1)
-- Returns the new total_xp. "Today" is the UTC date, like the client.

create or replace function public.add_xp(p_xp integer, p_lessons integer default 0)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_day   date := (now() at time zone 'utc')::date;
  v_total integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- Largest legitimate award: a lesson with a 2× boost and a 14-day milestone (140)
  if p_xp is null or p_xp < 0 or p_xp > 200 then
    raise exception 'invalid_xp';
  end if;
  if p_lessons is null or p_lessons < 0 or p_lessons > 1 then
    raise exception 'invalid_lessons';
  end if;

  if p_xp > 0 then
    update public.user_profiles
       set total_xp = total_xp + p_xp
     where user_id = v_uid
    returning total_xp into v_total;
  else
    select total_xp into v_total from public.user_profiles where user_id = v_uid;
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
