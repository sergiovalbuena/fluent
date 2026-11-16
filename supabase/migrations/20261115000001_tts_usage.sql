-- Daily limit for generating new AI voice clips (/api/tts). Clips already in the
-- cache are free and don't count; only a text nobody has played before calls
-- OpenAI. Counted next to MarIA's messages and the pronunciation attempts, one
-- row per user and UTC day; only use_tts_generation can change it.

alter table public.ai_usage
  add column if not exists tts_generations integer not null default 0;

-- Counts one generation if the user is under p_limit today. Returns the
-- generations left after this one, or -1 when the limit was already reached
-- (nothing counted).
create or replace function public.use_tts_generation(p_limit integer)
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

  insert into ai_usage (user_id, usage_date, messages, tts_generations)
  values (v_uid, (now() at time zone 'utc')::date, 0, 1)
  on conflict (user_id, usage_date) do update
    set tts_generations = ai_usage.tts_generations + 1
    where ai_usage.tts_generations < p_limit
  returning tts_generations into v_used;

  if v_used is null then return -1; end if;
  return p_limit - v_used;
end;
$$;

revoke all on function public.use_tts_generation(integer) from public, anon;
grant execute on function public.use_tts_generation(integer) to authenticated;
