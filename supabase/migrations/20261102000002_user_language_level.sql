-- Level of each course, estimated in the onboarding (self-reported level plus a
-- "select the words you know" check). CEFR: A0 = from scratch … C2. Null for
-- courses started before the onboarding asked for it. Only stored for now.

alter table public.user_languages
  add column if not exists level text
  check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
