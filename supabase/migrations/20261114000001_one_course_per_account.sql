-- One course per account: a second language will be paid. Clients could set
-- user_languages.is_unlocked themselves (RLS only checks the row is theirs), so:
--   * protect_course_unlock: for client roles is_unlocked keeps its old value
--     (false on insert), and a locked course can't be made the active one. The
--     owner's account is exempt (every course open, for testing the content).
--   * choose_course: the onboarding's way to pick or change the course. It runs
--     as the owner, so it may unlock; for everyone but the owner it locks the
--     other courses (changing course swaps it, progress is kept).
-- Same pattern as protect_xp / add_xp.

create or replace function public.protect_course_unlock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and auth.uid() is distinct from '3c8a6d64-5446-4acb-936a-8347b2ed0344'::uuid then
    if tg_op = 'INSERT' then
      new.is_unlocked := false;
    else
      new.is_unlocked := old.is_unlocked;
    end if;
    if new.is_active and not new.is_unlocked then
      raise exception 'Course % is locked', new.language_code using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger user_languages_protect_unlock
  before insert or update on public.user_languages
  for each row execute function public.protect_course_unlock();

create or replace function public.choose_course(p_language text, p_level text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.languages where code = p_language and is_available) then
    raise exception 'Language not available' using errcode = '22023';
  end if;

  update public.user_languages set is_active = false where user_id = v_user;

  insert into public.user_languages (user_id, language_code, is_active, is_unlocked, level)
  values (v_user, p_language, true, true, p_level)
  on conflict (user_id, language_code) do update
    set is_active = true,
        is_unlocked = true,
        level = coalesce(excluded.level, public.user_languages.level);

  if v_user <> '3c8a6d64-5446-4acb-936a-8347b2ed0344'::uuid then
    update public.user_languages set is_unlocked = false
    where user_id = v_user and language_code <> p_language;
  end if;
end;
$$;

revoke execute on function public.choose_course(text, text) from public, anon;
grant execute on function public.choose_course(text, text) to authenticated;
