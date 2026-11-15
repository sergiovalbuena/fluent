-- Daily limit for pronunciation practice (Azure Pronunciation Assessment is paid
-- per second of audio). Counted next to MarIA's messages, one row per user and UTC
-- day; only use_speech_attempt can change it.

alter table public.ai_usage
  add column if not exists speech_attempts integer not null default 0;

-- Counts one attempt if the user is under p_limit today. Returns the attempts left
-- after this one, or -1 when the limit was already reached (nothing counted).
create or replace function public.use_speech_attempt(p_limit integer)
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

  insert into ai_usage (user_id, usage_date, messages, speech_attempts)
  values (v_uid, (now() at time zone 'utc')::date, 0, 1)
  on conflict (user_id, usage_date) do update
    set speech_attempts = ai_usage.speech_attempts + 1
    where ai_usage.speech_attempts < p_limit
  returning speech_attempts into v_used;

  if v_used is null then return -1; end if;
  return p_limit - v_used;
end;
$$;

revoke all on function public.use_speech_attempt(integer) from public, anon;
grant execute on function public.use_speech_attempt(integer) to authenticated;
