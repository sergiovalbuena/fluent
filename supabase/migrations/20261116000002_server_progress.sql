-- Lesson progress moves to the database. Clients wrote user_progress directly
-- (stars, score, completed_at, has_crown: RLS only checked the row was theirs), so
-- anyone could mark lessons as done and open the course path without spending
-- gems, and total_crowns could be set to any value. Same pattern as add_xp,
-- record_activity and choose_course:
--
--   * module_available(user, module): the /learn rule (src/lib/course-path.ts) —
--     done, current, the next one, the first 10, unlocked with gems, or the owner.
--     A guest (anonymous sign-in) gets lesson 1 only.
--   * save_activity_progress(lesson, score, stars, markers): the only way to
--     complete an activity. Refuses locked lessons, computes stars from the score
--     (a lower value may be passed: typing without pronunciation is 2 stars) and
--     credits the gems (+1 repeat, +2 perfect, through award_gems).
--   * award_crown(module): the crown, only with every lesson of the module at 3 stars.
--   * Clients can no longer insert or update user_progress, nor write total_crowns.

create or replace function public.module_available(p_user uuid, p_module uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select language_code from public.modules where id = p_module
  ),
  mods as (
    select m.id,
           row_number() over (order by m.order_index) - 1 as idx,
           (select count(*) from public.lessons l where l.module_id = m.id) as total,
           (select count(*) from public.user_progress p
             where p.user_id = p_user and p.module_id = m.id and p.completed_at is not null) as done
      from public.modules m, target t
     where m.language_code = t.language_code and m.is_published
  ),
  cur as (
    select coalesce(min(idx) filter (where not (total > 0 and done >= total)), 1000000) as idx from mods
  )
  select case
    -- A guest (anonymous sign-in, trying it before signing up) gets lesson 1 only
    when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
      exists (select 1 from mods where mods.id = p_module and mods.idx = 0)
    else
      p_user = '3c8a6d64-5446-4acb-936a-8347b2ed0344'::uuid
      or exists (select 1 from public.user_unlocked_modules u where u.user_id = p_user and u.module_id = p_module)
      or exists (
        select 1 from mods, cur
         where mods.id = p_module
           and (mods.idx < 10                              -- FREE_LESSONS
                or mods.idx <= cur.idx + 1                 -- done, current or the next one
                or (mods.total > 0 and mods.done >= mods.total))
      )
  end;
$$;

revoke all on function public.module_available(uuid, uuid) from public, anon, authenticated;

create or replace function public.save_activity_progress(
  p_lesson uuid,
  p_score integer,
  p_stars integer default null,
  p_markers text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_module   uuid;
  v_type     text;
  v_row      public.user_progress%rowtype;
  v_found    boolean;
  v_calc     integer;
  v_stars    integer;
  v_markers  text[];
  v_gems     integer;
  v_credited integer := 0;
  v_first    boolean;
  v_final    integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'invalid_score';
  end if;

  select module_id, type into v_module, v_type from public.lessons where id = p_lesson;
  if not found then
    raise exception 'lesson_not_found';
  end if;
  if not public.module_available(v_uid, v_module) then
    raise exception 'lesson_locked' using errcode = '42501';
  end if;

  v_calc  := case when p_score >= 80 then 3 when p_score >= 60 then 2 else 1 end;
  v_stars := least(greatest(coalesce(p_stars, v_calc), 1), v_calc);

  -- What gets recorded in activities_completed: the activity, or "<activity>:speak"
  v_markers := coalesce(p_markers, array[v_type]);
  if cardinality(v_markers) > 4
     or exists (select 1 from unnest(v_markers) m where m !~ '^[a-z]{2,20}(:speak)?$') then
    raise exception 'invalid_markers';
  end if;

  select * into v_row from public.user_progress
   where user_id = v_uid and lesson_id = p_lesson
   for update;
  v_found := found;
  v_first := not v_found or v_row.completed_at is null;

  v_gems := (case when coalesce(v_row.attempts, 0) > 0 then 1 else 0 end)
          + (case when p_score = 100 then 2 else 0 end);
  if v_gems > 0 then
    v_credited := coalesce(public.award_gems(v_gems, 'lesson_activity', p_lesson::text), 0);
  end if;

  insert into public.user_progress as up
    (user_id, lesson_id, module_id, completed_at, score, best_score, stars, gems_earned, activities_completed, attempts)
  values
    (v_uid, p_lesson, v_module, now(), p_score, p_score, v_stars, v_credited, to_jsonb(v_markers), 1)
  on conflict (user_id, lesson_id) do update
    set completed_at         = now(),
        module_id            = excluded.module_id,
        score                = excluded.score,
        best_score           = greatest(coalesce(up.best_score, 0), excluded.score),
        stars                = greatest(coalesce(up.stars, 0), excluded.stars),
        gems_earned          = coalesce(up.gems_earned, 0) + excluded.gems_earned,
        activities_completed = (
          select coalesce(jsonb_agg(distinct x), '[]'::jsonb)
            from (
              select jsonb_array_elements_text(coalesce(up.activities_completed, '[]'::jsonb)) as x
              union
              select jsonb_array_elements_text(excluded.activities_completed)
            ) s
        ),
        attempts             = coalesce(up.attempts, 0) + 1,
        updated_at           = now()
  returning stars into v_final;

  -- Counts as a lesson done today (atomic, see add_xp)
  perform public.add_xp(0, 1);

  return jsonb_build_object('stars', v_final, 'gems', v_credited, 'first_completion', v_first);
end;
$$;

revoke all on function public.save_activity_progress(uuid, integer, integer, text[]) from public, anon;
grant execute on function public.save_activity_progress(uuid, integer, integer, text[]) to authenticated;

-- Crown of a module: every lesson at 3 stars. Returns false when it was already awarded.
create or replace function public.award_crown(p_module uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_total   integer;
  v_three   integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select count(*) into v_total from public.lessons where module_id = p_module;
  select count(*) into v_three from public.user_progress
   where user_id = v_uid and module_id = p_module and stars >= 3;
  if v_total = 0 or v_three < v_total then
    raise exception 'not_eligible' using errcode = '42501';
  end if;

  if exists (select 1 from public.user_progress where user_id = v_uid and module_id = p_module and has_crown) then
    return false;
  end if;

  update public.user_progress set has_crown = true where user_id = v_uid and module_id = p_module;
  update public.user_profiles set total_crowns = coalesce(total_crowns, 0) + 1 where user_id = v_uid;
  return true;
end;
$$;

revoke all on function public.award_crown(uuid) from public, anon;
grant execute on function public.award_crown(uuid) to authenticated;

-- Clients read their progress but no longer write it
alter policy user_progress_insert_own on public.user_progress with check (false);
alter policy user_progress_update_own on public.user_progress using (false);

-- total_crowns only through award_crown (same pattern as protect_xp)
create or replace function public.protect_crowns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.total_crowns := 0;
    else
      new.total_crowns := old.total_crowns;
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger user_profiles_protect_crowns
  before insert or update on public.user_profiles
  for each row execute function public.protect_crowns();
