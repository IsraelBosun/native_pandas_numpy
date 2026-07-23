-- Migration 003: usernames + opt-in leaderboard.
--
-- Run once in Supabase -> SQL Editor. Safe to run on top of the existing
-- schema; it only adds a new table and a function and touches nothing already
-- there. No client schema change and no app_meta/review_log migration.
--
-- Adds a public identity layer (`profiles`) and a leaderboard. The score is
-- NOT stored and NOT written by the client: `public.leaderboard()` derives it
-- from `review_log` inside a security-definer function, so the public anon key
-- (which ships in the app binary, CLAUDE.md §9) can never inflate a score.
-- The client only ever reports its own RLS-guarded review rows.

create extension if not exists citext;

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- citext => case-insensitive uniqueness ("Ada" and "ada" collide). The check
  -- mirrors validateUsername() in src/lib/username.js — keep the two in lockstep.
  username citext unique
    constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  show_on_leaderboard boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Same model as every other table: a user only ever reads or writes their own
-- row. The client never reads other people's profiles directly — the
-- security-definer function below is the only thing that reads across users,
-- and it only ever exposes opted-in rows.
create policy "own rows" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- set_updated_at() already exists from the base schema.
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- XP mapping is identical to src/lib/xp.js (Again 0, Hard 5, Good 10, Easy 15).
-- Computing it here, server-side, from real grades is what makes the ranking
-- trustworthy. Returns opted-in users only, top rows by XP.
create or replace function public.leaderboard(row_limit integer default 100)
returns table (
  username citext,
  xp bigint,
  reviews bigint,
  is_me boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.username,
    coalesce(sum(case r.grade when 3 then 5 when 4 then 10 when 5 then 15 else 0 end), 0) as xp,
    count(r.user_id) as reviews,
    p.user_id = auth.uid() as is_me
  from public.profiles p
  left join public.review_log r on r.user_id = p.user_id
  where p.show_on_leaderboard = true
    and p.username is not null
  group by p.user_id, p.username
  order by xp desc, reviews desc, p.username asc
  limit greatest(1, least(row_limit, 500));
$$;

-- Lock the function down to signed-in callers only.
revoke all on function public.leaderboard(integer) from public;
grant execute on function public.leaderboard(integer) to authenticated;
