-- ============================================================
-- ChatSpace Core Experience System Migration
-- ADDITIVE ONLY — no drops, no renames, no destructive changes
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type response_source as enum ('prewritten', 'claude', 'hybrid');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tension_band as enum ('warming_up', 'image_zone', 'premium_zone', 'video_zone');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type request_status as enum ('pending', 'approved', 'in_progress', 'completed', 'delivered', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type arc_status as enum ('active', 'paused', 'completed', 'upcoming');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type vault_event_status as enum ('scheduled', 'active', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type notification_type as enum (
    'story_continuation', 'promised_drop', 'tension_reminder',
    'streak_protection', 'vault_event', 'limited_unlock',
    'seasonal_arc', 'life_event', 'custom_delivery'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type memory_category as enum (
    'favorite', 'emotional_weak_point', 'fantasy', 'inside_joke',
    'custom_request_ref', 'unlock_reaction', 'anniversary',
    'streak_milestone', 'promise', 'preference', 'life_detail'
  );
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 1) PREWRITTEN RESPONSE LIBRARY
-- The core of the 80-85% prewritten routing system
-- ============================================================
create table if not exists prewritten_responses (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  -- Classification
  topic_tag text not null,          -- flirt, compliment, tease, goodnight, good_morning, what_doing, reveal_setup, tension_line, cooldown, monetization_transition, session_continue
  mood_tag text not null,           -- playful, flirty, warm, mysterious, edgy, vulnerable, excited
  tension_band tension_band not null default 'warming_up',
  -- Content
  content text not null,
  -- Anti-repeat
  semantic_group text not null,     -- cluster ID for similar-meaning lines
  cooldown_seconds integer not null default 3600,
  weight integer not null default 1,
  -- Matching
  trigger_patterns text[] default '{}',  -- regex patterns that match user input
  min_message_count integer default 0,
  max_message_count integer,             -- null = no max
  requires_memory_key text,              -- only use if user has this memory
  -- State
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prewritten_persona_topic on prewritten_responses(persona_id, topic_tag);
create index if not exists idx_prewritten_persona_mood on prewritten_responses(persona_id, mood_tag);
create index if not exists idx_prewritten_semantic on prewritten_responses(persona_id, semantic_group);
create index if not exists idx_prewritten_tension on prewritten_responses(persona_id, tension_band);

alter table prewritten_responses enable row level security;
create policy "Service role manages prewritten" on prewritten_responses for all using (auth.role() = 'service_role');
create policy "Anyone can view active prewritten" on prewritten_responses for select using (is_active = true);

-- ============================================================
-- 2) RESPONSE USAGE TRACKING (Anti-Repeat)
-- Per-user tracking of which prewritten responses were used
-- ============================================================
create table if not exists response_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  response_id uuid not null references prewritten_responses(id) on delete cascade,
  semantic_group text not null,
  used_at timestamptz not null default now()
);

create index if not exists idx_response_usage_user_persona on response_usage(user_id, persona_id);
create index if not exists idx_response_usage_cooldown on response_usage(user_id, persona_id, response_id, used_at);
create index if not exists idx_response_usage_semantic on response_usage(user_id, persona_id, semantic_group, used_at);

alter table response_usage enable row level security;
create policy "Users can view own usage" on response_usage for select using (auth.uid() = user_id);
create policy "Service role manages usage" on response_usage for all using (auth.role() = 'service_role');

-- ============================================================
-- 3) MEDIA DELIVERY HISTORY (Media Anti-Repeat)
-- Per-user per-persona tracking of all media shown
-- ============================================================
create table if not exists media_delivery_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  moment_id uuid not null references moments(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  was_unlocked boolean not null default false,
  unique(user_id, moment_id)
);

create index if not exists idx_media_delivery_user_persona on media_delivery_history(user_id, persona_id);

alter table media_delivery_history enable row level security;
create policy "Users can view own delivery history" on media_delivery_history for select using (auth.uid() = user_id);
create policy "Service role manages delivery" on media_delivery_history for all using (auth.role() = 'service_role');

-- ============================================================
-- 4) TENSION STATE
-- Per-user per-persona tension meter state
-- ============================================================
create table if not exists tension_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  -- Tension score
  score numeric(5,2) not null default 0,
  current_band tension_band not null default 'warming_up',
  peak_score numeric(5,2) not null default 0,
  -- Cooldown state
  last_reward_at timestamptz,
  cooldown_until timestamptz,
  rewards_this_session integer not null default 0,
  -- Session tracking
  session_message_count integer not null default 0,
  session_started_at timestamptz not null default now(),
  -- Streak
  daily_streak integer not null default 0,
  last_active_date date,
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, persona_id)
);

create index if not exists idx_tension_user on tension_state(user_id);

alter table tension_state enable row level security;
create policy "Users can view own tension" on tension_state for select using (auth.uid() = user_id);
create policy "Service role manages tension" on tension_state for all using (auth.role() = 'service_role');

-- ============================================================
-- 5) TENSION EVENT LOG
-- Records every tension change for analytics and debugging
-- ============================================================
create table if not exists tension_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  -- Event details
  event_type text not null,  -- message_sent, reward_triggered, cooldown_drop, penalty, streak_bonus
  score_before numeric(5,2) not null,
  score_after numeric(5,2) not null,
  score_delta numeric(5,2) not null,
  band_before tension_band,
  band_after tension_band,
  -- Context
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_tension_events_user on tension_events(user_id, persona_id, created_at);

alter table tension_events enable row level security;
create policy "Users can view own tension events" on tension_events for select using (auth.uid() = user_id);
create policy "Service role manages tension events" on tension_events for all using (auth.role() = 'service_role');

-- ============================================================
-- 6) ENHANCED MOMENTS — add tags for injection engine
-- ============================================================
alter table moments add column if not exists tags text[] default '{}';
alter table moments add column if not exists rarity_tier text default 'common';  -- common, rare, ultra_rare, exclusive
alter table moments add column if not exists min_tension_score numeric(5,2) default 0;
alter table moments add column if not exists mood_tags text[] default '{}';
alter table moments add column if not exists story_arc_id uuid;
alter table moments add column if not exists vault_event_id uuid;
alter table moments add column if not exists is_custom_delivery boolean default false;
alter table moments add column if not exists delivered_count integer default 0;

-- ============================================================
-- 7) CUSTOM VIDEO REQUEST WORKFLOW
-- ============================================================
create table if not exists custom_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  -- Request content
  scene_idea text not null,
  outfit text,
  location_vibe text,
  mood text,
  style_references text,
  custom_notes text,
  -- Pricing
  pricing_tier text default 'standard',  -- standard, premium, exclusive
  price numeric(6,2),
  -- Workflow
  status request_status not null default 'pending',
  admin_notes text,
  rejection_reason text,
  -- Delivery
  delivered_moment_id uuid references moments(id) on delete set null,
  delivery_teaser_line text,
  -- Timestamps
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_custom_requests_user on custom_requests(user_id);
create index if not exists idx_custom_requests_persona on custom_requests(persona_id);
create index if not exists idx_custom_requests_status on custom_requests(status);

alter table custom_requests enable row level security;
create policy "Users can view own requests" on custom_requests for select using (auth.uid() = user_id);
create policy "Users can insert own requests" on custom_requests for insert with check (auth.uid() = user_id);
create policy "Service role manages requests" on custom_requests for all using (auth.role() = 'service_role');

-- ============================================================
-- 8) STORY ARCS
-- ============================================================
create table if not exists story_arcs (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  -- Arc definition
  title text not null,
  description text,
  arc_type text not null,  -- beach_trip, gym_transformation, jealous_ex, roommate, confession, vacation, birthday, surprise, custom
  -- Progression
  total_stages integer not null default 5,
  -- Scheduling
  start_date date,
  estimated_duration_days integer,
  -- State
  status arc_status not null default 'upcoming',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_story_arcs_persona on story_arcs(persona_id, status);

alter table story_arcs enable row level security;
create policy "Anyone can view active arcs" on story_arcs for select using (is_active = true);
create policy "Service role manages arcs" on story_arcs for all using (auth.role() = 'service_role');

-- ============================================================
-- 9) STORY ARC STAGES
-- ============================================================
create table if not exists story_arc_stages (
  id uuid primary key default gen_random_uuid(),
  arc_id uuid not null references story_arcs(id) on delete cascade,
  stage_number integer not null,
  -- Content
  title text not null,
  description text,
  dialogue_lines text[] default '{}',      -- prewritten lines for this stage
  callback_references text[] default '{}', -- references to prior stages
  -- Triggers
  trigger_type text not null default 'message_count',  -- message_count, days_elapsed, tension_threshold, manual
  trigger_value jsonb default '{}',
  -- Rewards at this stage
  reward_moment_id uuid references moments(id) on delete set null,
  push_notification_text text,
  -- State
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(arc_id, stage_number)
);

alter table story_arc_stages enable row level security;
create policy "Anyone can view active stages" on story_arc_stages for select using (is_active = true);
create policy "Service role manages stages" on story_arc_stages for all using (auth.role() = 'service_role');

-- ============================================================
-- 10) USER STORY ARC PROGRESS
-- ============================================================
create table if not exists user_arc_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arc_id uuid not null references story_arcs(id) on delete cascade,
  current_stage integer not null default 0,
  started_at timestamptz not null default now(),
  last_stage_at timestamptz,
  completed_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, arc_id)
);

alter table user_arc_progress enable row level security;
create policy "Users can view own arc progress" on user_arc_progress for select using (auth.uid() = user_id);
create policy "Service role manages arc progress" on user_arc_progress for all using (auth.role() = 'service_role');

-- ============================================================
-- 11) DAILY RITUALS
-- ============================================================
create table if not exists ritual_schedules (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  -- Schedule
  ritual_type text not null,           -- good_morning, lunch_checkin, after_work, gym_selfie, nighttime_confession, sleep_voicenote, weekend_surprise, sunday_special
  time_window_start time not null,     -- e.g. 07:00
  time_window_end time not null,       -- e.g. 09:00
  days_of_week integer[] default '{0,1,2,3,4,5,6}',  -- 0=Sunday
  -- Content pool
  dialogue_lines text[] default '{}',
  -- Optional reward
  reward_moment_id uuid references moments(id) on delete set null,
  reward_probability numeric(3,2) default 0.15,
  -- State
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ritual_schedules enable row level security;
create policy "Anyone can view active rituals" on ritual_schedules for select using (is_active = true);
create policy "Service role manages rituals" on ritual_schedules for all using (auth.role() = 'service_role');

-- ============================================================
-- 12) USER RITUAL STATE
-- ============================================================
create table if not exists user_ritual_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ritual_id uuid not null references ritual_schedules(id) on delete cascade,
  last_triggered_at timestamptz,
  times_triggered integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, ritual_id)
);

alter table user_ritual_state enable row level security;
create policy "Users can view own ritual state" on user_ritual_state for select using (auth.uid() = user_id);
create policy "Service role manages ritual state" on user_ritual_state for all using (auth.role() = 'service_role');

-- ============================================================
-- 13) RELATIONSHIP MILESTONES
-- ============================================================
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  -- Definition
  milestone_key text not null unique,    -- first_week, streak_7, streak_30, first_custom, first_video_unlock, first_late_night, highest_tension, vip_access, anniversary, birthday
  title text not null,
  description text,
  -- Rewards
  reward_type text,          -- rare_selfie_pack, hidden_story, personalized_callback, loyalty_discount, queue_priority, secret_mode, exclusive_vault
  reward_config jsonb default '{}',
  -- Requirements
  requirement_type text not null,   -- streak_days, total_days, purchase_count, tension_peak, custom_count, time_based
  requirement_value jsonb not null,
  -- Display
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table milestones enable row level security;
create policy "Anyone can view active milestones" on milestones for select using (is_active = true);
create policy "Service role manages milestones" on milestones for all using (auth.role() = 'service_role');

-- ============================================================
-- 14) USER MILESTONE PROGRESS
-- ============================================================
create table if not exists user_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_id uuid not null references milestones(id) on delete cascade,
  persona_id uuid references personas(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  reward_claimed boolean not null default false,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, milestone_id, persona_id)
);

alter table user_milestones enable row level security;
create policy "Users can view own milestones" on user_milestones for select using (auth.uid() = user_id);
create policy "Service role manages user milestones" on user_milestones for all using (auth.role() = 'service_role');

-- ============================================================
-- 15) VAULT EVENTS (Limited-Time Drops)
-- ============================================================
create table if not exists vault_events (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  -- Event definition
  title text not null,
  description text,
  event_type text not null,   -- weekend_only, flash_3hr, birthday, late_night, mood_surprise, post_custom_bonus, post_streak, top_supporters
  -- Scheduling
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Eligibility
  min_streak_days integer default 0,
  min_total_purchases integer default 0,
  subscriber_only boolean default false,
  -- State
  status vault_event_status not null default 'scheduled',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vault_events_status on vault_events(status, starts_at, ends_at);

alter table vault_events enable row level security;
create policy "Anyone can view active vaults" on vault_events for select using (is_active = true);
create policy "Service role manages vaults" on vault_events for all using (auth.role() = 'service_role');

-- ============================================================
-- 16) PUSH NOTIFICATION EVENTS
-- ============================================================
create table if not exists push_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  -- Content
  notification_type notification_type not null,
  title text not null,         -- persona name
  body text not null,          -- in-character text
  -- Linkage
  conversation_id uuid references conversations(id) on delete set null,
  moment_id uuid references moments(id) on delete set null,
  arc_id uuid references story_arcs(id) on delete set null,
  vault_event_id uuid references vault_events(id) on delete set null,
  -- Scheduling
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  opened_at timestamptz,
  -- State
  is_sent boolean not null default false,
  is_opened boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_events_pending on push_events(is_sent, scheduled_for);
create index if not exists idx_push_events_user on push_events(user_id, persona_id);

alter table push_events enable row level security;
create policy "Users can view own push events" on push_events for select using (auth.uid() = user_id);
create policy "Service role manages push events" on push_events for all using (auth.role() = 'service_role');

-- ============================================================
-- 17) LIFE CONTINUES THREAD EVENTS
-- Pre-scheduled "life continues without you" messages
-- ============================================================
create table if not exists life_events (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  -- Content
  event_type text not null,    -- gym, dinner, outing, photo, sleep, thinking, almost_sent
  dialogue_line text not null,
  -- Scheduling
  time_of_day time,            -- approximate time context
  days_of_week integer[] default '{0,1,2,3,4,5,6}',
  -- Media attachment
  moment_id uuid references moments(id) on delete set null,
  -- State
  weight integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table life_events enable row level security;
create policy "Anyone can view active life events" on life_events for select using (is_active = true);
create policy "Service role manages life events" on life_events for all using (auth.role() = 'service_role');

-- ============================================================
-- 18) USER LIFE EVENT DELIVERY LOG
-- ============================================================
create table if not exists user_life_event_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_event_id uuid not null references life_events(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  delivered_at timestamptz not null default now()
);

create index if not exists idx_life_event_log_user on user_life_event_log(user_id, delivered_at);

alter table user_life_event_log enable row level security;
create policy "Users can view own life event log" on user_life_event_log for select using (auth.uid() = user_id);
create policy "Service role manages life event log" on user_life_event_log for all using (auth.role() = 'service_role');

-- ============================================================
-- 19) CROSS-PERSONA REFERENCES
-- ============================================================
create table if not exists cross_persona_references (
  id uuid primary key default gen_random_uuid(),
  source_persona_id uuid not null references personas(id) on delete cascade,
  target_persona_id uuid not null references personas(id) on delete cascade,
  -- Content
  reference_type text not null,  -- mention, jealousy, crossover, rivalry, duo_event
  dialogue_lines text[] default '{}',
  -- Conditions
  min_user_conversations integer default 3,  -- user must have talked to target persona this many times
  -- State
  weight integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table cross_persona_references enable row level security;
create policy "Anyone can view active cross refs" on cross_persona_references for select using (is_active = true);
create policy "Service role manages cross refs" on cross_persona_references for all using (auth.role() = 'service_role');

-- ============================================================
-- 20) ENHANCED PERSONA MEMORIES — add category column
-- ============================================================
alter table persona_memories add column if not exists category text default 'preference';
alter table persona_memories add column if not exists source text default 'inferred';  -- inferred, explicit, system
alter table persona_memories add column if not exists last_referenced_at timestamptz;
alter table persona_memories add column if not exists reference_count integer default 0;
alter table persona_memories add column if not exists expires_at timestamptz;

-- ============================================================
-- 21) ENHANCED CONVERSATIONS — add routing metadata
-- ============================================================
alter table conversations add column if not exists total_prewritten_count integer default 0;
alter table conversations add column if not exists total_claude_count integer default 0;
alter table conversations add column if not exists current_tension_score numeric(5,2) default 0;
alter table conversations add column if not exists session_streak integer default 0;

-- ============================================================
-- 22) ENHANCED MESSAGES — add routing source
-- ============================================================
alter table messages add column if not exists source text default 'claude';  -- prewritten, claude, hybrid, system
alter table messages add column if not exists prewritten_response_id uuid;
alter table messages add column if not exists tension_delta numeric(5,2);

-- ============================================================
-- 23) ENHANCED PROFILES — add push + preferences
-- ============================================================
alter table profiles add column if not exists push_token text;
alter table profiles add column if not exists push_enabled boolean default true;
alter table profiles add column if not exists timezone text default 'America/New_York';
alter table profiles add column if not exists total_purchases integer default 0;
alter table profiles add column if not exists total_spent numeric(8,2) default 0;

-- ============================================================
-- 24) ROUTING CONFIDENCE LOG — for tuning the router
-- ============================================================
create table if not exists routing_decisions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_message text not null,
  -- Decision
  confidence_score numeric(3,2) not null,  -- 0.00 to 1.00
  route_chosen text not null,              -- prewritten, claude
  prewritten_response_id uuid references prewritten_responses(id) on delete set null,
  -- Context
  topic_detected text,
  mood_detected text,
  tension_at_time numeric(5,2),
  -- Result
  response_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_routing_decisions_conv on routing_decisions(conversation_id);

alter table routing_decisions enable row level security;
create policy "Service role manages routing decisions" on routing_decisions for all using (auth.role() = 'service_role');

-- ============================================================
-- 25) RPC: Get tension band from score
-- ============================================================
create or replace function get_tension_band(score numeric)
returns tension_band
language plpgsql immutable as $$
begin
  if score >= 90 then return 'video_zone';
  elsif score >= 70 then return 'premium_zone';
  elsif score >= 40 then return 'image_zone';
  else return 'warming_up';
  end if;
end;
$$;

-- ============================================================
-- 26) RPC: Calculate reveal probability
-- ============================================================
create or replace function calculate_reveal_probability(
  p_tension_score numeric,
  p_message_count integer,
  p_last_reward_minutes integer,
  p_streak_days integer
)
returns numeric
language plpgsql immutable as $$
declare
  base_prob numeric := 0;
  streak_bonus numeric := 0;
  cooldown_factor numeric := 1;
begin
  -- Must have minimum 10 messages
  if p_message_count < 10 then return 0; end if;

  -- Base probability from tension score
  if p_tension_score >= 90 then base_prob := 0.85;
  elsif p_tension_score >= 70 then base_prob := 0.55;
  elsif p_tension_score >= 40 then base_prob := 0.25;
  else base_prob := 0.05;
  end if;

  -- Message count bonus (rises after 10)
  base_prob := base_prob + least((p_message_count - 10) * 0.02, 0.3);

  -- Streak bonus
  streak_bonus := least(p_streak_days * 0.01, 0.1);

  -- Cooldown penalty (if reward was recent)
  if p_last_reward_minutes is not null and p_last_reward_minutes < 15 then
    cooldown_factor := 0.1;
  elsif p_last_reward_minutes is not null and p_last_reward_minutes < 30 then
    cooldown_factor := 0.5;
  end if;

  return least((base_prob + streak_bonus) * cooldown_factor, 0.95);
end;
$$;

-- ============================================================
-- 27) SEED: Default milestones
-- ============================================================
insert into milestones (milestone_key, title, description, requirement_type, requirement_value, reward_type, icon, sort_order) values
  ('first_week', 'First Week Together', 'You''ve been talking for a whole week', 'total_days', '{"days": 7}', 'rare_selfie_pack', '🌟', 1),
  ('streak_7', '7-Day Streak', 'Seven days in a row — she noticed', 'streak_days', '{"days": 7}', 'personalized_callback', '🔥', 2),
  ('streak_30', '30-Day Streak', 'A whole month of daily conversations', 'streak_days', '{"days": 30}', 'exclusive_vault', '💎', 3),
  ('first_custom', 'First Custom Request', 'You asked for something special', 'custom_count', '{"count": 1}', 'queue_priority', '🎬', 4),
  ('first_video_unlock', 'First Video Unlock', 'You unlocked your first video', 'purchase_count', '{"type": "video", "count": 1}', 'hidden_story', '📹', 5),
  ('first_late_night', 'Late Night Session', 'Staying up past midnight together', 'time_based', '{"after_hour": 0, "before_hour": 4}', 'personalized_callback', '🌙', 6),
  ('tension_peak', 'Maximum Tension', 'You hit 100 on the tension meter', 'tension_peak', '{"score": 100}', 'rare_selfie_pack', '⚡', 7),
  ('anniversary_30', 'One Month Anniversary', '30 days since your first message', 'total_days', '{"days": 30}', 'exclusive_vault', '💕', 8)
on conflict (milestone_key) do nothing;

-- ============================================================
-- 28) STORAGE BUCKET for custom request deliveries
-- ============================================================
insert into storage.buckets (id, name, public)
values ('custom-deliveries', 'custom-deliveries', false)
on conflict (id) do nothing;
