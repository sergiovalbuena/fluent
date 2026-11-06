-- XP can only change through add_xp (security definer, see 20261102000001_add_xp.sql).
-- Clients could write user_profiles.total_xp and user_activity.xp_earned /
-- lessons_completed directly (RLS only checks the row is theirs), and the study
-- group ranking reads them. Same pattern as protect_gem_balance: for client
-- roles the protected columns keep their old value (0 on insert); add_xp and
-- other definer functions run as the owner and are not affected.

create or replace function public.protect_xp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.total_xp := 0;
    else
      new.total_xp := old.total_xp;
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger user_profiles_protect_xp
  before insert or update on public.user_profiles
  for each row execute function public.protect_xp();

create or replace function public.protect_activity_xp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.xp_earned := 0;
      new.lessons_completed := 0;
    else
      new.xp_earned := old.xp_earned;
      new.lessons_completed := old.lessons_completed;
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger user_activity_protect_xp
  before insert or update on public.user_activity
  for each row execute function public.protect_activity_xp();
