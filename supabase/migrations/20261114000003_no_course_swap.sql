-- The course chosen in the onboarding is the free one; every other course stays
-- locked until it's paid (Stripe, later). choose_course no longer swaps courses:
-- it accepts the account's first course or one already unlocked. The owner's
-- account still picks any course.

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
  if v_user <> '3c8a6d64-5446-4acb-936a-8347b2ed0344'::uuid
     and exists (select 1 from public.user_languages where user_id = v_user and is_unlocked)
     and not exists (select 1 from public.user_languages where user_id = v_user and language_code = p_language and is_unlocked) then
    raise exception 'Course % is locked', p_language using errcode = '42501';
  end if;

  update public.user_languages set is_active = false where user_id = v_user;

  insert into public.user_languages (user_id, language_code, is_active, is_unlocked, level)
  values (v_user, p_language, true, true, p_level)
  on conflict (user_id, language_code) do update
    set is_active = true,
        is_unlocked = true,
        level = coalesce(excluded.level, public.user_languages.level);
end;
$$;
