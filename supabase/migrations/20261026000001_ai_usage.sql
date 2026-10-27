-- MarIA daily message limit: one row per user and UTC day.
-- Clients can read their own count; only use_ai_message can change it.

create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default ((now() at time zone 'utc')::date),
  messages   integer not null default 0,
  primary key (user_id, usage_date)
);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage for select using ((select auth.uid()) = user_id);

-- Counts one message if the user is under p_limit today. Returns the messages
-- left after this one, or -1 when the limit was already reached (nothing counted).
create or replace function public.use_ai_message(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_used integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_limit < 1 then return -1; end if;

  insert into ai_usage (user_id, usage_date, messages)
  values (v_uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_date) do update
    set messages = ai_usage.messages + 1
    where ai_usage.messages < p_limit
  returning messages into v_used;

  if v_used is null then return -1; end if;
  return p_limit - v_used;
end;
$$;

revoke all on function public.use_ai_message(integer) from public, anon;
grant execute on function public.use_ai_message(integer) to authenticated;
