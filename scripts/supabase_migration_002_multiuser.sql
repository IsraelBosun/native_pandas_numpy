-- Migration 002: real per-user accounts.
--
-- Run once in the Supabase dashboard -> SQL Editor. Only needed on a project
-- that was created with the pre-accounts version of supabase_schema.sql; a
-- fresh project built from that file today already has all of this.
--
-- WHAT CHANGES
--   review_log gains a `device_id` and it becomes part of the primary key.
--   Before this, the key was (user_id, client_id) where client_id is the
--   device's local SQLite autoincrement. That was safe only while each
--   account had exactly one device. With real signups, two phones on one
--   account both start counting at 1 and the second phone's history collides
--   with the first's — and the app pushes with `ignoreDuplicates`, so the
--   collision is silent data loss rather than an error.
--
-- ⚠️ THIS DELETES THE EXISTING ROWS.
--   Existing rows have no device_id, so there is no honest value to
--   backfill: tagging them all 'legacy' would make every device import them
--   as if another phone had written them, duplicating the history that is
--   already on the phone that produced it.
--
--   That is fine here *because local SQLite is the source of truth*
--   (CLAUDE.md §9) and the only account so far is the developer's own, whose
--   phone still holds every review. On first login after this migration the
--   app re-pushes its full local history and the cloud is whole again.
--
--   Do NOT run this if any device's local database has been lost and the
--   cloud copy is the only surviving copy of that progress. Run
--   supabase_migration_002b_multiuser_preserve.sql instead — it reaches the
--   same end state but tags the existing rows `legacy` and keeps them.
--   Run one or the other, never both.

begin;

-- Safety net: a full copy of the rows about to be deleted, kept in the same
-- database. Costs nothing, and turns the delete below into something you can
-- undo. Fails loudly if the table already exists, so a second run of this
-- migration stops here instead of overwriting the backup with empty rows.
create table public.review_log_backup_002 as
  select * from public.review_log;

-- Progress is re-pushed from the device; card_state and app_meta are
-- last-write-wins upserts so they repopulate on the next sync either way.
delete from public.review_log;

alter table public.review_log
  drop constraint review_log_pkey;

alter table public.review_log
  add column device_id text not null;

alter table public.review_log
  add primary key (user_id, device_id, client_id);

commit;

-- AFTER RUNNING THIS
--   1. Supabase -> Authentication -> Users: change the password on the old
--      shared sync account. It shipped inside the app bundle as
--      EXPO_PUBLIC_SUPABASE_PASSWORD, so it must be treated as public. That
--      account is now just a normal account — log into it from the app with
--      the new password and your progress is exactly where you left it.
--   2. Supabase -> Authentication -> Providers -> Email: decide whether to
--      require email confirmation. The app handles both (it tells the user to
--      check their inbox when confirmation is on).
--   3. Supabase -> Authentication -> URL Configuration: set the redirect URL
--      to `nativepandas://` if you want password-reset links to reopen the app.
--   4. Open the app, log in, and check that Stats shows your review count.
--      Once it does, the backup has served its purpose:
--        drop table public.review_log_backup_002;
--      Leave it in place until then. It is the undo button.
--
-- IF SOMETHING WENT WRONG AND YOU NEED THE OLD ROWS BACK
--   The backup has no device_id column, so restore it the same way 002b would
--   have kept them — as `legacy`, which the app imports and never re-uploads:
--
--     insert into public.review_log
--       (user_id, device_id, client_id, card_id, grade, reviewed_at, interval)
--     select user_id, 'legacy', client_id, card_id, grade, reviewed_at, interval
--       from public.review_log_backup_002
--     on conflict do nothing;
--
--   `on conflict do nothing` means this is safe even if the device has already
--   re-pushed some of the same history under its own device_id.
