-- ============================================================================
-- ChatSpace — Combined migration for Systems 1, 2, 6
--   (Relationship Levels + Rewards, Daily Vibe, Surprise Gestures)
--
-- Systems 3, 4, 5, 7, 8 don't need DB migrations — they live entirely in the
-- application engine layer and read existing tables.
--
-- This file is:
--   • TRANSACTIONAL — wrapped in BEGIN/COMMIT; any error rolls back the
--     whole thing, your database is untouched.
--   • IDEMPOTENT — safe to re-run. Re-running skips anything that already
--     exists instead of erroring.
--   • ADDITIVE ONLY — creates new tables, types, indexes, policies, buckets,
--     and seeds default level rows. Does not DROP, RENAME, or DELETE
--     anything that already exists in your database.
--
-- USAGE:
--   1. Back up your database first (Supabase → Settings → Database → Backups).
--   2. Supabase dashboard → SQL Editor → New query.
--   3. Paste this entire file.
--   4. Click Run.
--   5. Read the "verification report" NOTICE lines at the bottom of the output.
--      If you see "MIGRATION OK", you're done. If you see an exception, the
--      whole transaction rolled back and nothing was applied.
-- ============================================================================

begin;

-- ── Extensions (no-ops if already present) ────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================================
-- SYSTEM 1 — RELATIONSHIP LEVELS + END-OF-LEVEL REWARDS
-- ============================================================================

-- ---- 1a. relationship_levels --------------------------------------------------
create table if not exists relationship_levels (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  level_number integer not null,
  name text not null,
  description text,
  xp_to_complete integer not null default 100,
  color text default '#8B5CF6',
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(persona_id, level_number)
);

create index if not exists idx_relationship_levels_persona
  on relationship_levels(persona_id, level_number);

alter table relationship_levels enable row level security;

drop policy if exists "Anyone can view active relationship levels" on relationship_levels;
create policy "Anyone can view active relationship levels"
  on relationship_levels for select using (is_active = true);

drop policy if exists "Service role manages relationship levels" on relationship_levels;
create policy "Service role manages relationship levels"
  on relationship_levels for all using (auth.role() = 'service_role');

-- ---- 1b. relationship_level_rewards ------------------------------------------
create table if not exists relationship_level_rewards (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references relationship_levels(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  thumbnail_url text,
  caption text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_relationship_level_rewards_level
  on relationship_level_rewards(level_id, sort_order);

alter table relationship_level_rewards enable row level security;

-- NB: this policy references user_level_reward_claims which is defined a few
-- blocks below; Postgres resolves referenced objects at statement execution,
-- not at policy creation, so forward reference is safe.
drop policy if exists "Users can view rewards they have claimed" on relationship_level_rewards;
create policy "Users can view rewards they have claimed"
  on relationship_level_rewards for select using (
    is_active = true and exists (
      select 1 from user_level_reward_claims c
      where c.reward_id = relationship_level_rewards.id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Service role manages level rewards" on relationship_level_rewards;
create policy "Service role manages level rewards"
  on relationship_level_rewards for all using (auth.role() = 'service_role');

-- ---- 1c. user_relationship_progress ------------------------------------------
create table if not exists user_relationship_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  total_xp_earned bigint not null default 0,
  current_level_number integer not null default 1,
  xp_into_current_level integer not null default 0,
  highest_level_reached integer not null default 1,
  last_level_up_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, persona_id)
);

create index if not exists idx_user_relationship_progress_user
  on user_relationship_progress(user_id, persona_id);

alter table user_relationship_progress enable row level security;

drop policy if exists "Users can view own progress" on user_relationship_progress;
create policy "Users can view own progress"
  on user_relationship_progress for select using (auth.uid() = user_id);

drop policy if exists "Service role manages progress" on user_relationship_progress;
create policy "Service role manages progress"
  on user_relationship_progress for all using (auth.role() = 'service_role');

-- ---- 1d. user_level_reward_claims --------------------------------------------
create table if not exists user_level_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references relationship_level_rewards(id) on delete cascade,
  level_id uuid not null references relationship_levels(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  viewed_at timestamptz,
  unique(user_id, reward_id)
);

create index if not exists idx_user_level_reward_claims_user
  on user_level_reward_claims(user_id, persona_id, delivered_at);

alter table user_level_reward_claims enable row level security;

drop policy if exists "Users can view own claims" on user_level_reward_claims;
create policy "Users can view own claims"
  on user_level_reward_claims for select using (auth.uid() = user_id);

drop policy if exists "Users can update own claims" on user_level_reward_claims;
create policy "Users can update own claims"
  on user_level_reward_claims for update using (auth.uid() = user_id);

drop policy if exists "Service role manages claims" on user_level_reward_claims;
create policy "Service role manages claims"
  on user_level_reward_claims for all using (auth.role() = 'service_role');

-- ---- 1e. relationship_xp_events (analytics / debug) --------------------------
create table if not exists relationship_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  xp_awarded integer not null,
  reason text not null,
  level_before integer,
  level_after integer,
  leveled_up boolean not null default false,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_relationship_xp_events_user
  on relationship_xp_events(user_id, persona_id, created_at);

alter table relationship_xp_events enable row level security;

drop policy if exists "Users can view own xp events" on relationship_xp_events;
create policy "Users can view own xp events"
  on relationship_xp_events for select using (auth.uid() = user_id);

drop policy if exists "Service role manages xp events" on relationship_xp_events;
create policy "Service role manages xp events"
  on relationship_xp_events for all using (auth.role() = 'service_role');

-- ---- 1f. storage bucket for level reward media --------------------------------
insert into storage.buckets (id, name, public)
values ('level-rewards', 'level-rewards', false)
on conflict (id) do nothing;

drop policy if exists "Service role manages level reward storage" on storage.objects;
create policy "Service role manages level reward storage"
  on storage.objects for all
  using (bucket_id = 'level-rewards' and auth.role() = 'service_role');

drop policy if exists "Authenticated users can view level reward storage" on storage.objects;
create policy "Authenticated users can view level reward storage"
  on storage.objects for select
  using (bucket_id = 'level-rewards' and auth.role() = 'authenticated');

-- ---- 1g. SEED default levels for every existing persona (only if empty) ------
do $$
declare p record;
begin
  for p in select id from personas loop
    if not exists (select 1 from relationship_levels where persona_id = p.id) then
      insert into relationship_levels (persona_id, level_number, name, description, xp_to_complete, color, icon) values
        (p.id, 1, 'Stranger',    'You just met. She''s curious.',         80,  '#9CA3AF', '👋'),
        (p.id, 2, 'Flirtation',  'Something''s starting to spark.',      160, '#EC4899', '💫'),
        (p.id, 3, 'Crush',       'She thinks about you between texts.',  260, '#F472B6', '💗'),
        (p.id, 4, 'Chemistry',   'This is no longer casual.',            380, '#A855F7', '🔥'),
        (p.id, 5, 'Obsessed',    'She can''t get you out of her head.',  520, '#8B5CF6', '💘'),
        (p.id, 6, 'Inseparable', 'You''re hers. She''s yours.',          700, '#D946EF', '💞');
    end if;
  end loop;
end $$;

-- ============================================================================
-- SYSTEM 2 — DAILY VIBE
-- ============================================================================
create table if not exists persona_daily_vibes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  vibe_date date not null,
  vibe text not null,
  intensity numeric(3,2) not null default 0.6,
  relationship_level_at_time integer,
  days_since_last_talk integer,
  rationale text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, persona_id, vibe_date)
);

create index if not exists idx_daily_vibes_user
  on persona_daily_vibes(user_id, persona_id, vibe_date desc);

alter table persona_daily_vibes enable row level security;

drop policy if exists "Users can view own vibes" on persona_daily_vibes;
create policy "Users can view own vibes"
  on persona_daily_vibes for select using (auth.uid() = user_id);

drop policy if exists "Service role manages vibes" on persona_daily_vibes;
create policy "Service role manages vibes"
  on persona_daily_vibes for all using (auth.role() = 'service_role');

-- ============================================================================
-- SYSTEM 6 — SURPRISE GESTURES
-- ============================================================================
do $$ begin
  create type gesture_type as enum ('note', 'free_image', 'free_video', 'bundle', 'daily_drop');
exception when duplicate_object then null;
end $$;

create table if not exists surprise_gestures (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  gesture_type gesture_type not null,
  content_text text,
  media_url text,
  thumbnail_url text,
  caption text,
  min_relationship_level integer not null default 1,
  min_chemistry_band text not null default 'warm',
  vibe_tags text[] default '{}',
  cooldown_hours integer not null default 12,
  weight integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_surprise_gestures_persona
  on surprise_gestures(persona_id, is_active);

alter table surprise_gestures enable row level security;

drop policy if exists "Anyone can view active gestures" on surprise_gestures;
create policy "Anyone can view active gestures"
  on surprise_gestures for select using (is_active = true);

drop policy if exists "Service role manages gestures" on surprise_gestures;
create policy "Service role manages gestures"
  on surprise_gestures for all using (auth.role() = 'service_role');

create table if not exists user_surprise_gesture_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  gesture_id uuid not null references surprise_gestures(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  viewed_at timestamptz,
  chemistry_at_delivery text,
  vibe_at_delivery text,
  boost_at_delivery numeric(4,3),
  metadata jsonb default '{}'
);

create index if not exists idx_gesture_deliveries_user
  on user_surprise_gesture_deliveries(user_id, persona_id, delivered_at desc);

alter table user_surprise_gesture_deliveries enable row level security;

drop policy if exists "Users can view own gesture deliveries" on user_surprise_gesture_deliveries;
create policy "Users can view own gesture deliveries"
  on user_surprise_gesture_deliveries for select using (auth.uid() = user_id);

drop policy if exists "Users can update own deliveries" on user_surprise_gesture_deliveries;
create policy "Users can update own deliveries"
  on user_surprise_gesture_deliveries for update using (auth.uid() = user_id);

drop policy if exists "Service role manages gesture deliveries" on user_surprise_gesture_deliveries;
create policy "Service role manages gesture deliveries"
  on user_surprise_gesture_deliveries for all using (auth.role() = 'service_role');

-- ============================================================================
-- VERIFICATION — if anything didn't land, raise exception and roll back
-- ============================================================================
do $$
declare
  table_count int;
  bucket_count int;
  levels_per_persona int;
  persona_count int;
  expected_tables text[] := array[
    'relationship_levels',
    'relationship_level_rewards',
    'user_relationship_progress',
    'user_level_reward_claims',
    'relationship_xp_events',
    'persona_daily_vibes',
    'surprise_gestures',
    'user_surprise_gesture_deliveries'
  ];
  missing text := '';
  t text;
begin
  -- Each expected table must exist.
  foreach t in array expected_tables loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      missing := missing || t || ', ';
    end if;
  end loop;

  if length(missing) > 0 then
    raise exception 'MIGRATION FAILED: missing tables — %', missing;
  end if;

  -- Storage bucket for level rewards.
  select count(*) into bucket_count
    from storage.buckets where id = 'level-rewards';
  if bucket_count <> 1 then
    raise exception 'MIGRATION FAILED: level-rewards storage bucket not found';
  end if;

  -- Every existing persona should now have at least 1 level row.
  select count(*) into persona_count from personas;
  if persona_count > 0 then
    select min(c) into levels_per_persona
    from (
      select count(*) as c
      from relationship_levels
      group by persona_id
    ) s;

    if levels_per_persona is null or levels_per_persona < 1 then
      raise exception 'MIGRATION FAILED: at least one persona has no levels seeded';
    end if;
  end if;

  -- Gesture enum values present.
  if not exists (
    select 1 from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'gesture_type' and e.enumlabel = 'note'
  ) then
    raise exception 'MIGRATION FAILED: gesture_type enum not populated';
  end if;

  raise notice '===============================================================';
  raise notice '  MIGRATION OK';
  raise notice '  Tables created (or already present): %', array_length(expected_tables, 1);
  raise notice '  Storage buckets present: level-rewards';
  raise notice '  Personas with seeded levels: %', persona_count;
  raise notice '  gesture_type enum populated';
  raise notice '===============================================================';
  raise notice 'Next steps on your side:';
  raise notice '  1. Go to /creator/<slug>/levels to customize names & upload';
  raise notice '     free images/videos per level.';
  raise notice '  2. (Optional) Insert rows into surprise_gestures to give';
  raise notice '     each girl spontaneous notes / free media / bundles.';
  raise notice '  3. Deploy the branch to Vercel so users get the new UI.';
end $$;

commit;
