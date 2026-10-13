-- Email signups store the name as `display_name` in user metadata (see signup page);
-- the trigger only read OAuth keys, so those users got their email prefix as name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Backfill profiles that got the email prefix even though a name was given at signup
update public.user_profiles p
set display_name = trim(u.raw_user_meta_data->>'display_name')
from auth.users u
where u.id = p.user_id
  and nullif(trim(u.raw_user_meta_data->>'display_name'), '') is not null
  and p.display_name = split_part(u.email, '@', 1);
