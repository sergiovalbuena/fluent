-- Cache for AI-generated pronunciation audio (see src/app/api/tts/route.ts).
-- Public read; only the server (service role) writes, so no insert policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts', 'tts', true, 5242880, array['audio/mpeg'])
on conflict (id) do nothing;
