-- Users can update their own user_profiles row (RLS), which included is_admin.
-- Only privileged roles (service_role, postgres) may change it.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    else
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_protect_is_admin on public.user_profiles;
create trigger user_profiles_protect_is_admin
  before insert or update on public.user_profiles
  for each row execute function public.protect_is_admin();
