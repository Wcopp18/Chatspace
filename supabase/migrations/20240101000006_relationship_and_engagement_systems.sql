-- ============================================================
-- ChatSpace Relationship & Engagement Systems Migration
-- Covers: Relationship Levels, Daily Vibe, Session Chemistry,
--         Message Quality, Hidden Progress, Surprise Gestures,
--         Behavior Adaptation, Anti-Gaming
-- ADDITIVE ONLY
-- ============================================================

-- ============================================================
-- 1) RELATIONSHIP LEVELS (Creator-defined, per-persona)
-- These are the "stages" of a long-term relationship.
-- The creator defines catchy names, XP thresholds, and reward media.
-- ============================================================
create table if not exists relationship_levels (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  level_number integer not null,
  level_name text not null,            -- catchy phrase e.g. "Just Talking", "Catching Feelings"
  xp_required integer not null,        -- cumulative XP to reach this level
  description text,                    -- optional flavor text shown to user
  color_hex text default '#8B5CF6',    -- UI accent color for this level
  icon text,                           -- emoji or icon identifier
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(persona_id, level_number)
);

create index if not exists idx_rel_levels_persona on relationship_levels(persona_id, level_number);

alter table relationship_levels enable row level security;
create policy "Anyone can view active levels" on relationship_levels for select using (is_active = true);
create policy "Service role manages levels" on relationship_levels for all using (auth.role() = 'service_role');

-- ============================================================
-- 2) RELATIONSHIP LEVEL REWARDS (Creator uploads free media per level)
-- When a user completes a level, these rewards pop up as free content.
-- ============================================================
create table if not exists relationship_level_rewards (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references relationship_levels(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'note')),
  media_url text,                      -- Supabase storage URL
  thumbnail_url text,
  caption text,                        -- optional caption shown with the reward
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_level_rewards_level on relationship_level_rewards(level_id);

alter table relationship_level_rewards enable row level security;
create policy "Anyone can view active rewards" on relationship_level_rewards for select using (is_active = true);
create policy "Service role manages rewards" on relationship_level_rewards for all using (auth.role() = 'service_role');

-- ============================================================
-- 3) USER RELATIONSHIP PROGRESS (Per user-persona pair)
-- Tracks long-term XP, current level, and history.
-- ============================================================
create table if not exists user_relationship_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  current_level integer not null default 1,
  current_xp integer not null default 0,
  total_xp_earned integer not null default 0,
  total_messages_sent integer not null default 0,
  total_quality_messages integer not null default 0,
  longest_streak integer not null default 0,
  current_streak integer not null default 0,
  last_message_date date,
  level_completed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, persona_id)
);

create index if not exists idx_user_rel_progress on user_relationship_progress(user_id, persona_id);

alter table user_relationship_progress enable row level security;
create policy "Users can view own progress" on user_relationship_progress for select using (auth.uid() = user_id);
create policy "Service role manages progress" on user_relationship_progress for all using (auth.role() = 'service_role');

-- ============================================================
-- 4) USER LEVEL REWARD CLAIMS (Track which rewards user has received)
-- ============================================================
create table if not exists user_level_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references relationship_level_rewards(id) on delete cascade,
  level_id uuid not null references relationship_levels(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique(user_id, reward_id)
);

alter table user_level_reward_claims enable row level security;
create policy "Users can view own claims" on user_level_reward_claims for select using (auth.uid() = user_id);
create policy "Service role manages claims" on user_level_reward_claims for all using (auth.role() = 'service_role');

-- ============================================================
-- 5) DAILY VIBE (Per user-persona, refreshes daily)
-- The girl's emotional mood for the day.
-- ============================================================
create table if not exists daily_vibes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  vibe_date date not null default current_date,
  vibe text not null,                  -- playful, calm, affectionate, clingy, distant, flirty, mysterious, teasing, vulnerable, excited
  intensity numeric(3,2) not null default 0.50, -- 0.0 to 1.0, how strong the vibe is
  generated_from jsonb default '{}',   -- metadata: what factors influenced the vibe
  created_at timestamptz not null default now(),
  unique(user_id, persona_id, vibe_date)
);

create index if not exists idx_daily_vibes_lookup on daily_vibes(user_id, persona_id, vibe_date);

alter table daily_vibes enable row level security;
create policy "Users can view own vibes" on daily_vibes for select using (auth.uid() = user_id);
create policy "Service role manages vibes" on daily_vibes for all using (auth.role() = 'service_role');

-- ============================================================
-- 6) SESSION CHEMISTRY (Per conversation session)
-- Short-term emotional momentum within a single session.
-- ============================================================
create table if not exists session_chemistry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  -- Chemistry score
  score numeric(5,2) not null default 50.00,  -- 0-100 scale, starts at 50
  peak_score numeric(5,2) not null default 50.00,
  -- Message tracking
  good_message_count integer not null default 0,
  bad_message_count integer not null default 0,
  total_session_messages integer not null default 0,
  -- Streak within session
  positive_streak integer not null default 0,
  -- Session timing
  session_started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_chemistry_lookup on session_chemistry(user_id, persona_id);

alter table session_chemistry enable row level security;
create policy "Users can view own chemistry" on session_chemistry for select using (auth.uid() = user_id);
create policy "Service role manages chemistry" on session_chemistry for all using (auth.role() = 'service_role');

-- ============================================================
-- 7) HIDDEN PROGRESS (Invisible progress accumulator)
-- Tracks behind-the-scenes progress the user never directly sees.
-- ============================================================
create table if not exists hidden_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  -- Progress scores
  relationship_momentum numeric(5,2) not null default 0,  -- 0-100
  consistency_score numeric(5,2) not null default 0,       -- 0-100, how consistent they are
  surprise_readiness numeric(5,2) not null default 0,      -- 0-100, how close to a surprise
  next_reward_boost numeric(3,2) not null default 0,       -- 0-1, multiplier for next reward chance
  -- Counters
  consecutive_good_days integer not null default 0,
  total_good_sessions integer not null default 0,
  messages_since_last_reward integer not null default 0,
  days_since_last_reward integer not null default 0,
  -- Anti-gaming
  repetition_penalty numeric(3,2) not null default 0,      -- 0-1, how much they're repeating
  burst_penalty numeric(3,2) not null default 0,            -- 0-1, how much they're spamming
  topic_diversity_score numeric(3,2) not null default 0.50, -- 0-1, diversity of topics
  -- Timestamps
  last_reward_at timestamptz,
  last_good_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, persona_id)
);

create index if not exists idx_hidden_progress_lookup on hidden_progress(user_id, persona_id);

alter table hidden_progress enable row level security;
create policy "Service role manages hidden progress" on hidden_progress for all using (auth.role() = 'service_role');

-- ============================================================
-- 8) SURPRISE GESTURE LOG (Track all surprise deliveries)
-- Records when and what surprises were given.
-- ============================================================
create table if not exists surprise_gestures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  -- Gesture details
  gesture_type text not null,   -- free_image, free_video, special_note, daily_bundle, surprise_moment
  reward_id uuid,               -- references relationship_level_rewards or moments
  trigger_reason text not null, -- level_up, chemistry_peak, daily_vibe, hidden_progress, random_kindness
  -- Context at time of delivery
  relationship_level integer,
  chemistry_score numeric(5,2),
  daily_vibe text,
  -- Cooldown
  cooldown_until timestamptz,
  -- Timestamps
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_surprise_gestures_user on surprise_gestures(user_id, persona_id, delivered_at);

alter table surprise_gestures enable row level security;
create policy "Users can view own gestures" on surprise_gestures for select using (auth.uid() = user_id);
create policy "Service role manages gestures" on surprise_gestures for all using (auth.role() = 'service_role');

-- ============================================================
-- 9) MESSAGE QUALITY LOG (Per-message scoring record)
-- Stores the quality assessment of each user message.
-- ============================================================
create table if not exists message_quality_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  message_id uuid,
  -- Quality assessment
  quality_label text not null,      -- high, medium, low
  quality_score numeric(3,2) not null, -- 0.0 to 1.0
  -- Breakdown
  effort_score numeric(3,2) not null default 0.50,
  warmth_score numeric(3,2) not null default 0.50,
  relevance_score numeric(3,2) not null default 0.50,
  repetition_score numeric(3,2) not null default 0.00,  -- higher = more repetitive (bad)
  spam_score numeric(3,2) not null default 0.00,         -- higher = more spammy (bad)
  -- XP awarded
  xp_awarded integer not null default 0,
  -- Timestamp
  created_at timestamptz not null default now()
);

create index if not exists idx_msg_quality_user on message_quality_log(user_id, persona_id, created_at);

alter table message_quality_log enable row level security;
create policy "Service role manages quality log" on message_quality_log for all using (auth.role() = 'service_role');

-- ============================================================
-- 10) ANTI-GAMING STATE (Per user-persona tracking)
-- Tracks patterns that indicate gaming behavior.
-- ============================================================
create table if not exists anti_gaming_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  -- Recent message hashes for repetition detection
  recent_message_hashes text[] default '{}',
  recent_topics text[] default '{}',
  -- Counters
  burst_count integer not null default 0,          -- messages in rapid succession
  burst_window_start timestamptz,
  repeat_count integer not null default 0,         -- consecutive similar messages
  same_topic_count integer not null default 0,     -- consecutive same-topic messages
  -- Diminishing returns tracking
  reward_count_today integer not null default 0,
  reward_count_date date,
  diminishing_factor numeric(3,2) not null default 1.00, -- 1.0 = full value, decreases
  -- Cooldown
  hard_cooldown_until timestamptz,
  soft_cooldown_until timestamptz,
  -- Timestamps
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, persona_id)
);

create index if not exists idx_anti_gaming_lookup on anti_gaming_state(user_id, persona_id);

alter table anti_gaming_state enable row level security;
create policy "Service role manages anti-gaming" on anti_gaming_state for all using (auth.role() = 'service_role');

-- ============================================================
-- STORAGE BUCKET for relationship level rewards
-- ============================================================
insert into storage.buckets (id, name, public)
values ('level-rewards', 'level-rewards', false)
on conflict (id) do nothing;

create policy "Authenticated users can view level rewards"
  on storage.objects for select using (
    bucket_id = 'level-rewards' and auth.role() = 'authenticated'
  );

create policy "Service role can manage level rewards"
  on storage.objects for all using (
    bucket_id = 'level-rewards' and auth.role() = 'service_role'
  );
