-- Migration 002b: real per-user accounts, KEEPING the existing cloud rows.
--
-- Same end state as supabase_migration_002_multiuser.sql — review_log gains a
-- `device_id` that becomes part of the primary key. The difference is what
-- happens to the rows that are already there: 002 deletes them, this one tags
-- them `legacy` and keeps them.
--
-- RUN THIS ONE INSTEAD OF 002 WHEN THE CLOUD IS THE LAST COPY, i.e. the phone
-- that produced this history has been wiped, reinstalled, or lost.
--
-- ⚠️ DO NOT RUN THIS IF A DEVICE STILL HOLDS THE SAME REVIEWS LOCALLY.
--   The app imports any remote row whose device_id differs from its own
--   (lib/merge.js remoteLogsToImport). A phone that still has these reviews as
--   its own un-pushed rows would import a second copy of each, and stats,
--   retention and XP would all count them twice. In that situation the phone
--   is the source of truth and 002 is the correct migration.
--
--   Not sure? Open the app on the device and check Stats. If the review count
--   is there, the phone still has the history -> use 002. If it's zero or the
--   app is freshly installed -> use this file.

begin;

alter table public.review_log
  drop constraint review_log_pkey;

-- Added nullable: Postgres cannot add a NOT NULL column with no default to a
-- table that already has rows.
alter table public.review_log
  add column device_id text;

-- One shared marker for everything written before devices were identifiable.
-- It only has to be distinct from any real device_id (which lib/cards.js mints
-- as `<base36 timestamp>-<random>-<random>`), and unique per row is neither
-- possible nor needed — the old key already guaranteed client_id is unique
-- within a user, so (user_id, 'legacy', client_id) cannot collide.
update public.review_log
  set device_id = 'legacy'
  where device_id is null;

alter table public.review_log
  alter column device_id set not null;

alter table public.review_log
  add primary key (user_id, device_id, client_id);

commit;

-- WHAT THE APP DOES NEXT
--   On first login the device pulls these rows down, sees device_id 'legacy'
--   != its own id, and inserts them locally with synced = 1 — so they count in
--   stats and XP (which read review_log unfiltered) but are never pushed back
--   up. The local unique index on (device_id, origin_id) makes a repeated pull
--   a no-op, so syncing twice is harmless.
--
--   card_state and app_meta are untouched by this migration and merge down as
--   normal, which is what actually restores the streak, due dates and
--   achievements.
--
-- AFTER RUNNING THIS
--   1. Supabase -> Authentication -> Users: change the password on the old
--      shared sync account. It shipped inside the app bundle as
--      EXPO_PUBLIC_SUPABASE_PASSWORD, so it must be treated as public. That
--      account is now just a normal account — log into it from the app with
--      the new password to pull this history back onto the device.
--   2. Supabase -> Authentication -> Providers -> Email: decide whether to
--      require email confirmation. The app handles both.
--   3. Supabase -> Authentication -> URL Configuration: set the redirect URL
--      to `nativepandas://` if you want password-reset links to reopen the app.
