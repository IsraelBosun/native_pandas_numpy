-- Run this once in the Supabase dashboard -> SQL Editor -> New query.
--
-- Progress-sync tables: cloud mirrors of the app's local SQLite progress
-- layer (see lib/db.js). Content (lessons/cards) stays bundled in the app
-- and never lands here. Every table is keyed by user_id so one project
-- serves many users; auth.uid() fills it in automatically on insert.

create table public.card_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id text not null,
  ef real not null default 2.5,
  interval integer not null default 0,
  reps integer not null default 0,
  due_date text not null,
  last_grade integer,
  reviewed_at text,
  favorite integer not null default 0,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table public.review_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Which install wrote the row (app_meta.device_id in the device's SQLite).
  -- client_id is only unique *within* an install — two phones on one account
  -- both start their autoincrement at 1 — so provenance has to be part of the
  -- key or the second device's history silently collides with the first's.
  device_id text not null,
  -- The row's autoincrement id in that device's SQLite. Using it in the
  -- primary key makes pushes idempotent: re-sending the same rows after a
  -- flaky connection can never create duplicates.
  client_id bigint not null,
  card_id text not null,
  grade integer not null,
  reviewed_at text not null,
  interval integer not null,
  primary key (user_id, device_id, client_id)
);

create table public.app_meta (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.card_state enable row level security;
alter table public.review_log enable row level security;
alter table public.app_meta enable row level security;

-- Each signed-in user can only read/write their own rows. This is the whole
-- security model: the anon key ships inside the app binary and is meant to be
-- public, so these policies are what keep one learner out of another's data.
create policy "own rows" on public.card_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own rows" on public.review_log
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own rows" on public.app_meta
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep updated_at honest on upserts.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger card_state_updated_at before update on public.card_state
  for each row execute function public.set_updated_at();

create trigger app_meta_updated_at before update on public.app_meta
  for each row execute function public.set_updated_at();

-- Public identity + opt-in leaderboard (added in migration 003). Unlike the
-- tables above, a `profiles` row is meant to be seen by other users — but only
-- through public.leaderboard(), never by reading the table directly. The score
-- is derived from review_log server-side so the public anon key can't spoof it.
create extension if not exists citext;

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- citext => case-insensitive uniqueness; check mirrors src/lib/username.js.
  username citext unique
    constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  show_on_leaderboard boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own rows" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- XP mapping identical to src/lib/xp.js. Security-definer so it can aggregate
-- across users, but it only ever returns opted-in rows.
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

revoke all on function public.leaderboard(integer) from public;
grant execute on function public.leaderboard(integer) to authenticated;
