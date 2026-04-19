-- ============================================================
-- ChatSpace Relationship Levels System
-- Long-term progression meter replacing/augmenting the session tension meter.
-- Creator defines custom levels (catchy names + XP thresholds) per persona.
-- At end of each level, creator-supplied free media is delivered to the user.
-- ADDITIVE ONLY — no drops, no renames.
-- ============================================================

-- ------------------------------------------------------------
-- 1) RELATIONSHIP LEVELS (creator-defined, per persona)
-- ------------------------------------------------------------
create table if not exists relationship_levels (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  level_number integer not null,           -- 1, 2, 3, ... per persona
  name text not null,                      -- creator's catchy phrase e.g. "Stranger", "Crush", "Obsessed"
  description text,
  xp_to_complete integer not null default 100,
  color text default '#8B5CF6',
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(persona_id, level_number)
);

create index if not exists idx_relationship_levels_persona on relationship_levels(persona_id, level_number);

alter table relationship_levels enable row level security;
create policy "Anyone can view active relationship levels"
  on relationship_levels for select using (is_active = true);
create policy "Service role manages relationship levels"
  on relationship_levels for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 2) RELATIONSHIP LEVEL REWARDS (free media delivered on completion)
-- ------------------------------------------------------------
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

create index if not exists idx_relationship_level_rewards_level on relationship_level_rewards(level_id, sort_order);

alter table relationship_level_rewards enable row level security;
create policy "Users can view rewards they have claimed"
  on relationship_level_rewards for select using (
    is_active = true and exists (
      select 1 from user_level_reward_claims c
      where c.reward_id = relationship_level_rewards.id
        and c.user_id = auth.uid()
    )
  );
create policy "Service role manages level rewards"
  on relationship_level_rewards for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 3) USER RELATIONSHIP PROGRESS (long-term, never resets)
-- ------------------------------------------------------------
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

create index if not exists idx_user_relationship_progress_user on user_relationship_progress(user_id, persona_id);

alter table user_relationship_progress enable row level security;
create policy "Users can view own progress"
  on user_relationship_progress for select using (auth.uid() = user_id);
create policy "Service role manages progress"
  on user_relationship_progress for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 4) USER LEVEL REWARD CLAIMS (which rewards the user has received)
-- ------------------------------------------------------------
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

create index if not exists idx_user_level_reward_claims_user on user_level_reward_claims(user_id, persona_id, delivered_at);

alter table user_level_reward_claims enable row level security;
create policy "Users can view own claims"
  on user_level_reward_claims for select using (auth.uid() = user_id);
create policy "Users can update own claims"
  on user_level_reward_claims for update using (auth.uid() = user_id);
create policy "Service role manages claims"
  on user_level_reward_claims for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 5) RELATIONSHIP XP EVENTS (for debugging/analytics, optional)
-- ------------------------------------------------------------
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

create index if not exists idx_relationship_xp_events_user on relationship_xp_events(user_id, persona_id, created_at);

alter table relationship_xp_events enable row level security;
create policy "Users can view own xp events"
  on relationship_xp_events for select using (auth.uid() = user_id);
create policy "Service role manages xp events"
  on relationship_xp_events for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 6) STORAGE BUCKET for level reward media
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('level-rewards', 'level-rewards', false)
on conflict (id) do nothing;

create policy "Service role manages level reward storage"
  on storage.objects for all using (bucket_id = 'level-rewards' and auth.role() = 'service_role');

create policy "Authenticated users can view level reward storage"
  on storage.objects for select using (bucket_id = 'level-rewards' and auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 7) SEED: default levels for each existing persona (if none configured)
-- ------------------------------------------------------------
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
