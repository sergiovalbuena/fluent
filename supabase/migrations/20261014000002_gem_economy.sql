-- Gem economy: a ledger, server-side earning/spending, boosts and early unlocks.
-- Clients can no longer write total_gems directly; they call award_gems / buy_item.

-- ── Tables ─────────────────────────────────────────────────────────────────────

create table if not exists public.gem_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     integer not null,            -- positive = earned, negative = spent
  reason     text not null,               -- lesson_activity, minigame, xp_boost, unlock_module, …
  ref        text,                        -- lesson / module id when relevant
  created_at timestamptz not null default now()
);
create index if not exists gem_transactions_user_idx on public.gem_transactions (user_id, created_at desc);
alter table public.gem_transactions enable row level security;
drop policy if exists gem_transactions_select_own on public.gem_transactions;
create policy gem_transactions_select_own on public.gem_transactions for select using (auth.uid() = user_id);

create table if not exists public.user_boosts (
  user_id    uuid not null references auth.users (id) on delete cascade,
  boost      text not null check (boost in ('xp', 'gems')),
  expires_at timestamptz not null,
  primary key (user_id, boost)
);
alter table public.user_boosts enable row level security;
drop policy if exists user_boosts_select_own on public.user_boosts;
create policy user_boosts_select_own on public.user_boosts for select using (auth.uid() = user_id);

create table if not exists public.user_unlocked_modules (
  user_id    uuid not null references auth.users (id) on delete cascade,
  module_id  uuid not null references public.modules (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, module_id)
);
alter table public.user_unlocked_modules enable row level security;
drop policy if exists user_unlocked_modules_select_own on public.user_unlocked_modules;
create policy user_unlocked_modules_select_own on public.user_unlocked_modules for select using (auth.uid() = user_id);

alter table public.user_profiles
  add column if not exists streak_freezes integer not null default 0 check (streak_freezes between 0 and 2);

-- ── Balance guard ──────────────────────────────────────────────────────────────
-- Same approach as protect_is_admin: client roles can't change these columns;
-- the security-definer functions below run as the owner and can.

create or replace function public.protect_gem_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.total_gems := 0;
      new.streak_freezes := 0;
    else
      new.total_gems := old.total_gems;
      new.streak_freezes := old.streak_freezes;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_protect_gem_balance on public.user_profiles;
create trigger user_profiles_protect_gem_balance
  before insert or update on public.user_profiles
  for each row execute function public.protect_gem_balance();

-- ── Earning ────────────────────────────────────────────────────────────────────
-- Rewards are still computed by the client, so each award is capped (per call
-- and per day) to keep the economy bounded. An active gems boost doubles it.

create or replace function public.award_gems(p_amount integer, p_reason text, p_ref text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_amount   integer := least(greatest(coalesce(p_amount, 0), 0), 10);
  v_today    integer;
  v_daily_cap constant integer := 150;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_reason not in ('lesson_activity', 'minigame', 'chest', 'bonus') then raise exception 'invalid_reason'; end if;
  if v_amount = 0 then return 0; end if;

  if exists (select 1 from user_boosts where user_id = v_uid and boost = 'gems' and expires_at > now()) then
    v_amount := v_amount * 2;
  end if;

  select coalesce(sum(amount), 0) into v_today
  from gem_transactions
  where user_id = v_uid and amount > 0 and created_at >= date_trunc('day', now());

  v_amount := least(v_amount, greatest(v_daily_cap - v_today, 0));
  if v_amount = 0 then return 0; end if;

  update user_profiles set total_gems = total_gems + v_amount where user_id = v_uid;
  insert into gem_transactions (user_id, amount, reason, ref) values (v_uid, v_amount, p_reason, left(p_ref, 100));
  return v_amount;
end;
$$;

-- ── Spending ───────────────────────────────────────────────────────────────────
-- Prices live here, not in the client.

create or replace function public.buy_item(p_item text, p_ref text default null)
returns integer   -- new balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_price   integer;
  v_balance integer;
  v_freezes integer;
  v_module  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  v_price := case p_item
    when 'xp_boost'      then 20
    when 'gems_boost'    then 25
    when 'streak_freeze' then 30
    when 'unlock_module' then 40
  end;
  if v_price is null then raise exception 'invalid_item'; end if;

  -- Lock the profile row so concurrent purchases can't overspend
  select total_gems, streak_freezes into v_balance, v_freezes
  from user_profiles where user_id = v_uid for update;
  if v_balance is null then raise exception 'no_profile'; end if;
  if v_balance < v_price then raise exception 'insufficient_gems'; end if;

  if p_item in ('xp_boost', 'gems_boost') then
    if exists (select 1 from user_boosts where user_id = v_uid
               and boost = split_part(p_item, '_', 1) and expires_at > now()) then
      raise exception 'already_active';
    end if;
    insert into user_boosts (user_id, boost, expires_at)
    values (v_uid, split_part(p_item, '_', 1),
            now() + case p_item when 'xp_boost' then interval '15 minutes' else interval '30 minutes' end)
    on conflict (user_id, boost) do update set expires_at = excluded.expires_at;
  elsif p_item = 'streak_freeze' then
    if v_freezes >= 2 then raise exception 'max_freezes'; end if;
    update user_profiles set streak_freezes = streak_freezes + 1 where user_id = v_uid;
  elsif p_item = 'unlock_module' then
    v_module := p_ref::uuid;
    if not exists (select 1 from modules where id = v_module and is_published) then raise exception 'invalid_module'; end if;
    insert into user_unlocked_modules (user_id, module_id) values (v_uid, v_module)
    on conflict do nothing;
    if not found then raise exception 'already_unlocked'; end if;
  end if;

  update user_profiles set total_gems = total_gems - v_price where user_id = v_uid
  returning total_gems into v_balance;
  insert into gem_transactions (user_id, amount, reason, ref) values (v_uid, -v_price, p_item, left(p_ref, 100));
  return v_balance;
end;
$$;

-- Spends one streak freeze to keep a streak alive after a missed day
create or replace function public.use_streak_freeze()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  update user_profiles set streak_freezes = streak_freezes - 1
  where user_id = v_uid and streak_freezes > 0;
  return found;
end;
$$;

revoke all on function public.award_gems(integer, text, text) from public, anon;
revoke all on function public.buy_item(text, text) from public, anon;
revoke all on function public.use_streak_freeze() from public, anon;
grant execute on function public.award_gems(integer, text, text) to authenticated;
grant execute on function public.buy_item(text, text) to authenticated;
grant execute on function public.use_streak_freeze() to authenticated;
