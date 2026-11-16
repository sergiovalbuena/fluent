-- Portuguese, German, Italian and Japanese only have the 10 lessons of the old
-- demo. They are no longer offered (COURSE_LANGUAGES in src/lib/languages.ts);
-- this makes choose_course and setActiveLanguage refuse them too.
update public.languages set is_available = false where code in ('pt', 'de', 'it', 'ja');
