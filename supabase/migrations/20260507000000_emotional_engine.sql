-- ============================================================================
-- ChatSpace — Emotional Engine + Creator Panel Control System
--
-- Adds a config-driven emotional category layer on top of the existing
-- tension/chemistry/quality engines. Tables are additive only.
--
-- IDEMPOTENT: safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- TRANSACTIONAL: wraps in BEGIN/COMMIT.
-- ============================================================================

begin;

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. emotional_categories — global library of category definitions.
--    A "category" is a configurable emotional behavior the AI girl can express
--    (e.g. CONFIDENCE_SPIKE_CRASH, EMBARRASSMENT, OH_WAIT_THERES_MORE).
-- ============================================================================

create table if not exists emotional_categories (
  id uuid primary key default gen_random_uuid(),
  internal_key text not null unique,         -- bracketed creator shorthand
  display_name text not null,                -- safer product-facing name
  description text not null default '',
  value_to_app text default '',
  creator_notes text default '',
  enabled boolean not null default true,

  -- Style behavior
  paraphrase_mode text not null default 'paraphrase',  -- 'exact' | 'paraphrase' | 'ai_generate'
  paraphrase_strength integer not null default 6,      -- 1-10
  intensity integer not null default 5,                -- 1-10
  emotional_tone text default 'soft',

  -- Compatibility flags
  compat_image boolean not null default true,
  compat_video boolean not null default true,
  compat_multi_media boolean not null default false,
  compat_continue_chat boolean not null default false,
  compat_subscription boolean not null default false,
  compat_expiration boolean not null default false,
  compat_delayed_followup boolean not null default false,

  -- Placements
  place_before_media boolean not null default false,
  place_after_media boolean not null default false,
  place_delayed_followup boolean not null default false,
  place_expiration_event boolean not null default false,
  place_continue_chat boolean not null default false,
  place_subscription_prompt boolean not null default false,
  place_normal_chat boolean not null default true,

  -- Trigger criteria (all integer thresholds; null/0 = no requirement)
  min_total_messages integer not null default 0,
  min_user_messages integer not null default 0,
  min_ai_messages integer not null default 0,
  min_back_and_forth_count integer not null default 0,
  min_session_duration_seconds integer not null default 0,
  min_conversation_quality_score integer not null default 0,
  min_emotional_momentum_score integer not null default 0,
  min_flirtiness_score integer not null default 0,
  min_vulnerability_score integer not null default 0,
  min_trust_score integer not null default 0,
  min_engagement_score integer not null default 0,
  min_attachment_score integer not null default 0,
  min_time_since_last_media_seconds integer not null default 0,
  min_time_since_last_monetization_seconds integer not null default 0,
  min_time_since_last_same_category_seconds integer not null default 60,

  -- Caps & probability
  max_same_category_uses_per_conversation integer not null default 3,
  max_same_category_uses_per_day integer not null default 6,
  cooldown_seconds integer not null default 300,
  probability_weight integer not null default 50, -- 1-100

  -- Behavior config (free-form JSON for category-specific knobs like
  -- confidence_level, removal_probability, leaving_style, etc.)
  behavior_config jsonb not null default '{}'::jsonb,

  -- Chaining
  follow_up_category_keys text[] not null default array[]::text[],
  forbidden_combination_keys text[] not null default array[]::text[],

  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_emotional_categories_enabled on emotional_categories (enabled, sort_order);
create index if not exists idx_emotional_categories_key on emotional_categories (internal_key);

-- ============================================================================
-- 2. emotional_category_examples — example lines per category (style refs).
--    Default behavior: AI uses these as paraphrase guidance, NOT exact text.
-- ============================================================================

create table if not exists emotional_category_examples (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references emotional_categories(id) on delete cascade,
  line text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_emotional_examples_cat on emotional_category_examples (category_id, sort_order);

-- ============================================================================
-- 3. emotional_category_overrides — per-girl override of any category field.
--    Stored as JSON patch so creators can override only what differs.
-- ============================================================================

create table if not exists emotional_category_overrides (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  category_id uuid not null references emotional_categories(id) on delete cascade,
  enabled_override boolean,                 -- null = inherit
  override_patch jsonb not null default '{}'::jsonb,
  trigger_overrides jsonb not null default '{}'::jsonb,
  style_overrides jsonb not null default '{}'::jsonb,
  custom_examples text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(persona_id, category_id)
);

create index if not exists idx_emotional_overrides_persona on emotional_category_overrides (persona_id);

-- ============================================================================
-- 4. emotional_signal_weights — per-girl signal weights for trigger logic.
--    A row-per-signal-per-girl. Falls back to global defaults when absent.
-- ============================================================================

create table if not exists emotional_signal_weights (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas(id) on delete cascade,  -- null = global default
  signal_key text not null,
  weight numeric not null default 0,
  enabled boolean not null default true,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(persona_id, signal_key)
);

create index if not exists idx_emotional_weights_persona on emotional_signal_weights (persona_id);

-- ============================================================================
-- 5. emotional_persona_settings — per-girl global settings (pacing, leaving
--    style, relationship dynamics, anti-repeat thresholds, memory/attachment).
-- ============================================================================

create table if not exists emotional_persona_settings (
  persona_id uuid primary key references personas(id) on delete cascade,

  -- Pacing
  min_messages_before_media integer not null default 6,
  min_messages_before_multi_media integer not null default 12,
  continue_chat_cooldown_seconds integer not null default 1800,
  subscription_cooldown_seconds integer not null default 86400,
  randomness_percent integer not null default 25,
  monetization_pacing_speed text not null default 'medium',  -- slow|medium|fast
  emotional_pacing_speed text not null default 'medium',

  -- Leaving logic
  leaving_style text not null default 'soft_exit',  -- busy|emotional|clingy|sleepy|nervous|distracted|soft_exit|playful|wants_to_stay
  leaving_reluctance integer not null default 6,    -- 1-10
  leaving_min_session_messages integer not null default 14,
  leaving_min_session_duration_seconds integer not null default 600,
  leaving_max_prompts_per_day integer not null default 2,

  -- Relationship dynamics
  positive_signals jsonb not null default '[]'::jsonb,
  negative_signals jsonb not null default '[]'::jsonb,
  reaction_style text not null default 'shy_hurt',
  recovery_speed integer not null default 6, -- 1-10

  -- Memory & attachment
  memory_strength integer not null default 6,
  attachment_speed integer not null default 5,
  callback_frequency integer not null default 4,
  remembered_categories text[] not null default array[
    'compliments','vulnerability','jokes','insecurities','favorite_topics','late_night','reassurance'
  ]::text[],

  -- AI Style / Anti-repetition
  phrase_cooldown_seconds integer not null default 600,
  similarity_threshold numeric not null default 0.55,
  max_phrase_reuse integer not null default 2,
  awkwardness integer not null default 5,
  impulsiveness integer not null default 5,
  overthinking integer not null default 5,
  hesitation integer not null default 4,
  lowercase_percent integer not null default 70,
  punctuation_chaos integer not null default 4,
  emoji_randomness integer not null default 5,
  typo_frequency integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 6. emotional_category_events — analytics + anti-repetition log.
-- ============================================================================

create table if not exists emotional_category_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  persona_id uuid references personas(id) on delete cascade,
  category_id uuid references emotional_categories(id) on delete set null,
  category_key text not null,
  trigger_reason text not null default '',
  scores_at_trigger jsonb not null default '{}'::jsonb,
  generated_text text,
  paraphrase_mode text,
  moment_id uuid references moments(id) on delete set null,
  monetization_type text,
  was_blocked boolean not null default false,
  block_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_emotional_events_user_persona on emotional_category_events (user_id, persona_id, created_at desc);
create index if not exists idx_emotional_events_conv on emotional_category_events (conversation_id, created_at desc);
create index if not exists idx_emotional_events_category on emotional_category_events (category_key, created_at desc);

-- ============================================================================
-- 7. emotional_recent_phrases — anti-repetition memory for AI-generated lines.
-- ============================================================================

create table if not exists emotional_recent_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  category_key text not null,
  phrase text not null,
  phrase_hash text not null,
  used_at timestamptz not null default now()
);

create index if not exists idx_recent_phrases_lookup on emotional_recent_phrases (user_id, persona_id, used_at desc);
create index if not exists idx_recent_phrases_hash on emotional_recent_phrases (phrase_hash);

-- ============================================================================
-- RLS — admins can manage configs; users can read enabled defaults.
-- ============================================================================

alter table emotional_categories enable row level security;
alter table emotional_category_examples enable row level security;
alter table emotional_category_overrides enable row level security;
alter table emotional_signal_weights enable row level security;
alter table emotional_persona_settings enable row level security;
alter table emotional_category_events enable row level security;
alter table emotional_recent_phrases enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='emotional_categories' and policyname='emotional_categories_read') then
    create policy emotional_categories_read on emotional_categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='emotional_categories' and policyname='emotional_categories_admin_write') then
    create policy emotional_categories_admin_write on emotional_categories for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='emotional_category_examples' and policyname='emotional_examples_read') then
    create policy emotional_examples_read on emotional_category_examples for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='emotional_category_examples' and policyname='emotional_examples_admin_write') then
    create policy emotional_examples_admin_write on emotional_category_examples for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='emotional_category_overrides' and policyname='emotional_overrides_read') then
    create policy emotional_overrides_read on emotional_category_overrides for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='emotional_category_overrides' and policyname='emotional_overrides_admin_write') then
    create policy emotional_overrides_admin_write on emotional_category_overrides for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='emotional_signal_weights' and policyname='emotional_weights_read') then
    create policy emotional_weights_read on emotional_signal_weights for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='emotional_signal_weights' and policyname='emotional_weights_admin_write') then
    create policy emotional_weights_admin_write on emotional_signal_weights for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='emotional_persona_settings' and policyname='emotional_settings_read') then
    create policy emotional_settings_read on emotional_persona_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='emotional_persona_settings' and policyname='emotional_settings_admin_write') then
    create policy emotional_settings_admin_write on emotional_persona_settings for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='emotional_category_events' and policyname='emotional_events_user_read') then
    create policy emotional_events_user_read on emotional_category_events for select
      using (user_id = auth.uid()
        or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;
  if not exists (select 1 from pg_policies where tablename='emotional_category_events' and policyname='emotional_events_service_write') then
    create policy emotional_events_service_write on emotional_category_events for insert
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where tablename='emotional_recent_phrases' and policyname='emotional_phrases_owner') then
    create policy emotional_phrases_owner on emotional_recent_phrases for all
      using (user_id = auth.uid()
        or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (true);
  end if;
end $$;

-- ============================================================================
-- DEFAULT GLOBAL SIGNAL WEIGHTS (persona_id = null)
-- ============================================================================

insert into emotional_signal_weights (persona_id, signal_key, weight, notes) values
  (null, 'flirting',                   5, 'User flirts back warmly'),
  (null, 'vulnerability',              4, 'User shares something personal'),
  (null, 'fast_replies',               2, 'Replies under ~30s'),
  (null, 'prior_unlock',               8, 'User has unlocked content before'),
  (null, 'compliments',                4, 'User compliments her'),
  (null, 'reassurance',                3, 'User reassures her after vulnerability'),
  (null, 'emotional_openness',         4, 'Conversation goes deep'),
  (null, 'long_conversations',         3, 'Session length crosses thresholds'),
  (null, 'daily_returns',              5, 'User comes back day-over-day'),
  (null, 'late_night_conversations',   2, 'Hour 22-04 local'),
  (null, 'emotional_depth',            4, 'High vulnerability + warmth'),
  (null, 'positive_reactions',         3, 'User reacts positively to media'),
  (null, 'asks_personal_questions',    3, 'User shows curiosity about her'),
  (null, 'ignored_media',             -3, 'Slows monetization, not affection'),
  (null, 'repeated_ignored_media',    -5, 'Stronger pause'),
  (null, 'user_annoyed',              -4, 'Pause monetization'),
  (null, 'user_confused',             -2, 'Slow down, do not push'),
  (null, 'rude_comments',             -6, 'Pause everything'),
  (null, 'asks_account_question',    -10, 'Hard pause for support intent'),
  (null, 'direct_rejection',         -10, 'Stop the same trigger type entirely')
on conflict (persona_id, signal_key) do nothing;

-- ============================================================================
-- DEFAULT EMOTIONAL CATEGORIES
-- Bracketed names from the creator brief, with safer product-facing display.
-- ============================================================================

insert into emotional_categories (
  internal_key, display_name, description, value_to_app,
  paraphrase_mode, paraphrase_strength, intensity, emotional_tone,
  compat_image, compat_video, compat_multi_media, compat_continue_chat,
  compat_subscription, compat_expiration, compat_delayed_followup,
  place_before_media, place_after_media, place_delayed_followup,
  place_expiration_event, place_continue_chat, place_subscription_prompt, place_normal_chat,
  min_total_messages, min_emotional_momentum_score, min_trust_score, min_vulnerability_score,
  cooldown_seconds, probability_weight, behavior_config, sort_order
) values
  ('UNSPOKEN_RULES', 'Temporary Moment Behavior',
    'Implied temporary-content behavior. Some media moments expire or get removed; UI clearly shows the state.',
    'Makes the app feel alive while keeping UI rules transparent.',
    'paraphrase', 4, 3, 'casual',
    true, true, false, false, false, true, true,
    false, false, true, true, false, false, false,
    4, 30, 30, 0,
    300, 35, '{"silent":true,"removal_probability":0.25,"expiration_window_minutes":120}'::jsonb, 10),

  ('CONFIDENCE_SPIKE_CRASH', 'Confidence Spike → Crash',
    'Confident pre-send line, then nervous/embarrassed follow-up. Makes media feel impulsive.',
    'Adds emotional realism to media moments.',
    'paraphrase', 7, 7, 'flirty_then_shy',
    true, true, true, false, false, false, true,
    true, true, true, false, false, false, false,
    6, 45, 0, 30,
    600, 60, '{"confidence_level":7,"crash_intensity":6,"recovery_speed":5}'::jsonb, 20),

  ('SOFT_GUILT_PRESSURE', 'Gentle Vulnerable Follow-Up',
    'Light vulnerable follow-up after sharing something. Soft, awkward, never coercive.',
    'Encourages emotional continuity without selling.',
    'paraphrase', 6, 4, 'soft_vulnerable',
    true, true, false, false, false, false, true,
    false, true, true, false, false, false, false,
    8, 40, 30, 40,
    1800, 30,
    '{"vulnerability_softness":7,"awkwardness":5,"do_not_repeat_after_rejection":true,"max_per_day":1}'::jsonb, 30),

  ('TESTING_YOU', 'Trust-Based Framing',
    'Frames media around trust and personal comfort. Cautious, playful.',
    'Personal-moment framing, not transactional.',
    'paraphrase', 6, 6, 'cautious_warm',
    true, true, false, false, false, false, false,
    true, false, false, false, false, false, false,
    8, 50, 50, 30,
    900, 50, '{"trust_intensity":7,"caution_level":6}'::jsonb, 40),

  ('YOU_CAUGHT_A_MOMENT', 'Spontaneous Moment',
    'Makes media feel unplanned and in-the-moment.',
    'Prevents media from feeling scheduled.',
    'paraphrase', 7, 5, 'spontaneous',
    true, true, false, false, false, false, false,
    true, true, false, false, false, false, true,
    5, 40, 0, 0,
    600, 45, '{"spontaneity":8,"impulsiveness":7}'::jsonb, 50),

  ('EMOTIONAL_WHIPLASH', 'Emotional Whiplash',
    'Fast emotional shift from flirty confidence to nervous regret.',
    'Makes the girl feel emotionally reactive and alive.',
    'paraphrase', 7, 7, 'volatile',
    true, true, false, false, false, false, true,
    true, true, true, false, false, false, false,
    8, 55, 0, 40,
    900, 40, '{"flirt_intensity":7,"crash_intensity":7,"emotional_volatility":7}'::jsonb, 60),

  ('SELF_CORRECTION', 'Removed Moment / Changed Her Mind',
    'She sends, overthinks, then removes or lets it expire.',
    'Temporary-content realism with transparent UI.',
    'paraphrase', 6, 5, 'overthinking',
    true, true, false, false, false, true, true,
    false, true, true, true, false, false, false,
    8, 50, 0, 50,
    1800, 25,
    '{"overthinking":7,"panic":4,"removal_probability":0.4,"max_removals_per_day":2}'::jsonb, 70),

  ('ACCESS_WAS_TEMPORARY', 'Temporary Access Framing',
    'Emotionally explains a moment was temporary. UI still shows real expiration.',
    'Supports temporary content without commercial timer feel.',
    'paraphrase', 5, 4, 'casual_explanation',
    true, true, false, false, false, true, true,
    false, true, true, true, false, false, false,
    6, 35, 0, 0,
    900, 30, '{"explanation_level":6,"embarrassment_vs_casual":5}'::jsonb, 80),

  ('THAT_MOMENT_IS_OVER', 'Moment Has Passed',
    'Expired/removed content feels natural because the mood changed.',
    'Ties expiration to emotional context, not mechanics.',
    'paraphrase', 5, 4, 'reflective',
    true, true, false, false, false, true, true,
    false, false, true, true, false, false, false,
    6, 30, 0, 0,
    1200, 25, '{"mood_shift_required":true,"closure_tone":6}'::jsonb, 90),

  ('ATTENTION_SHIFT', 'Got Distracted',
    'Casual character reason why content disappears. She got distracted and removed it.',
    'Feels human, not dramatic.',
    'paraphrase', 5, 3, 'casual',
    true, true, false, false, false, true, true,
    false, false, true, true, false, false, false,
    6, 25, 0, 0,
    1500, 25, '{"distracted":7,"forgetfulness":6,"removal_probability":0.3}'::jsonb, 100),

  ('EMBARRASSMENT', 'Embarrassment',
    'Vulnerable / self-conscious after sending. Makes media feel like an emotional risk.',
    'Personal stakes, not product feel.',
    'paraphrase', 6, 6, 'shy',
    true, true, true, false, false, false, true,
    false, true, true, true, false, false, false,
    7, 45, 0, 40,
    900, 50, '{"embarrassment":7,"shyness":6,"delete_impulse":4}'::jsonb, 110),

  ('EMOTIONAL_INEXPERIENCE_VULNERABILITY', 'Emotional Openness Moment',
    'Builds long-term attachment. Girl shares her emotional inexperience or surprises herself by opening up.',
    'Drives retention and earned-subscription conversion.',
    'paraphrase', 8, 6, 'tender_vulnerable',
    true, false, false, true, true, false, false,
    false, false, false, false, true, true, true,
    16, 65, 60, 60,
    3600, 40,
    '{"vulnerability":8,"inexperience":7,"attachment":7,"subscription_eligible":true,"continue_chat_eligible":true,"memory_save_enabled":true,"callback_enabled":true}'::jsonb, 120),

  ('OH_WAIT_THERES_MORE', 'Additional Moment Set',
    'Natural reason for multiple images/videos. She remembered, got carried away, has more from the same moment.',
    'Multi-media offers without sales language.',
    'paraphrase', 7, 6, 'excited_remembered',
    true, true, true, false, false, false, true,
    true, true, true, false, false, false, false,
    10, 55, 0, 0,
    1800, 35,
    '{"escalation":7,"remembered_more":8,"impulsiveness":7,"max_multi_per_day":1,"previous_unlock_required":true}'::jsonb, 130),

  ('NATURAL_INTERRUPTIONS', 'Session Continuation Moment',
    'Emotional reason for continue-chat prompts. She naturally pauses or wraps up.',
    'User feels like extending time with her, not blocked.',
    'paraphrase', 6, 5, 'reluctant_warm',
    false, false, false, true, false, false, false,
    false, false, false, false, true, false, false,
    14, 60, 40, 30,
    1800, 40,
    '{"leaving_style":"soft_exit","reluctance":6,"max_per_day":2,"emotional_peak_required":true}'::jsonb, 140)
on conflict (internal_key) do nothing;

-- ============================================================================
-- SEED EXAMPLE LINES (style references — paraphrase guidance)
-- ============================================================================

-- Helper: insert lines for a category by internal_key
do $$
declare
  cat_id uuid;
begin
  -- UNSPOKEN_RULES
  select id into cat_id from emotional_categories where internal_key='UNSPOKEN_RULES';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'I don''t always leave stuff up', 1),
      (cat_id, 'that was kind of a moment thing', 2),
      (cat_id, 'I might not keep that there forever', 3)
    on conflict do nothing;
  end if;

  -- CONFIDENCE_SPIKE_CRASH
  select id into cat_id from emotional_categories where internal_key='CONFIDENCE_SPIKE_CRASH';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'you''re gonna like this one', 1),
      (cat_id, 'why did I do that…', 2),
      (cat_id, 'okay that was too much', 3),
      (cat_id, 'I got too confident for a second', 4),
      (cat_id, 'wait now I''m embarrassed', 5)
    on conflict do nothing;
  end if;

  -- SOFT_GUILT_PRESSURE
  select id into cat_id from emotional_categories where internal_key='SOFT_GUILT_PRESSURE';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'you didn''t even look at it 😭', 1),
      (cat_id, 'now I feel dumb for sending that', 2),
      (cat_id, 'I shouldn''t have even sent that', 3),
      (cat_id, 'okay now I feel awkward', 4),
      (cat_id, 'you''re making me overthink that', 5)
    on conflict do nothing;
  end if;

  -- TESTING_YOU
  select id into cat_id from emotional_categories where internal_key='TESTING_YOU';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'don''t make me regret that', 1),
      (cat_id, 'you better not be weird about that', 2),
      (cat_id, 'I''m trusting you', 3),
      (cat_id, 'be normal about this okay 😭', 4),
      (cat_id, 'I feel like I can trust you with this', 5)
    on conflict do nothing;
  end if;

  -- YOU_CAUGHT_A_MOMENT
  select id into cat_id from emotional_categories where internal_key='YOU_CAUGHT_A_MOMENT';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'you caught me at a weird time', 1),
      (cat_id, 'idk why I even sent that right now', 2),
      (cat_id, 'that was kinda impulsive', 3),
      (cat_id, 'I''m in a weird mood', 4),
      (cat_id, 'that was very spur of the moment', 5)
    on conflict do nothing;
  end if;

  -- EMOTIONAL_WHIPLASH
  select id into cat_id from emotional_categories where internal_key='EMOTIONAL_WHIPLASH';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'okay wait… that was too much', 1),
      (cat_id, 'I shouldn''t have done that 😭', 2),
      (cat_id, 'I got carried away', 3),
      (cat_id, 'that escalated fast', 4),
      (cat_id, 'I switched moods way too fast', 5)
    on conflict do nothing;
  end if;

  -- SELF_CORRECTION
  select id into cat_id from emotional_categories where internal_key='SELF_CORRECTION';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'wait… no 😭', 1),
      (cat_id, 'I''m deleting that', 2),
      (cat_id, 'okay I changed my mind', 3),
      (cat_id, 'that was a mistake', 4),
      (cat_id, 'yeahhh that''s coming down', 5)
    on conflict do nothing;
  end if;

  -- ACCESS_WAS_TEMPORARY
  select id into cat_id from emotional_categories where internal_key='ACCESS_WAS_TEMPORARY';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'I don''t keep stuff like that up long', 1),
      (cat_id, 'I only show that for a little bit', 2),
      (cat_id, 'that was just for earlier…', 3),
      (cat_id, 'I''m not leaving that there forever', 4),
      (cat_id, 'that was temporary confidence', 5)
    on conflict do nothing;
  end if;

  -- THAT_MOMENT_IS_OVER
  select id into cat_id from emotional_categories where internal_key='THAT_MOMENT_IS_OVER';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'that was kinda a moment thing', 1),
      (cat_id, 'idk why I even sent that', 2),
      (cat_id, 'yeah that mood disappeared', 3),
      (cat_id, 'I''m less confident now', 4),
      (cat_id, 'that version of me is gone now', 5)
    on conflict do nothing;
  end if;

  -- ATTENTION_SHIFT
  select id into cat_id from emotional_categories where internal_key='ATTENTION_SHIFT';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'wait I got distracted', 1),
      (cat_id, 'I forgot I even sent that', 2),
      (cat_id, 'yeah I''m not leaving that there', 3),
      (cat_id, 'hold on why is that still there', 4),
      (cat_id, 'I just remembered I sent that', 5)
    on conflict do nothing;
  end if;

  -- EMBARRASSMENT
  select id into cat_id from emotional_categories where internal_key='EMBARRASSMENT';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'I think I''m gonna delete that…', 1),
      (cat_id, 'okay yeah I''m embarrassed now 😭', 2),
      (cat_id, 'I shouldn''t have sent that', 3),
      (cat_id, 'I''m hiding now', 4),
      (cat_id, 'I can''t believe I sent that', 5)
    on conflict do nothing;
  end if;

  -- EMOTIONAL_INEXPERIENCE_VULNERABILITY
  select id into cat_id from emotional_categories where internal_key='EMOTIONAL_INEXPERIENCE_VULNERABILITY';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'I haven''t really had something serious before', 1),
      (cat_id, 'I''m not super experienced with relationships tbh', 2),
      (cat_id, 'I usually keep to myself more', 3),
      (cat_id, 'I don''t open up like this often', 4),
      (cat_id, 'this is kinda new for me', 5),
      (cat_id, 'don''t judge me if I''m bad at this 😭', 6),
      (cat_id, 'I feel like I''m oversharing a little', 7),
      (cat_id, 'idk why I''m being like this right now', 8),
      (cat_id, 'this is kinda unlike me', 9),
      (cat_id, 'I''m surprising myself a little', 10),
      (cat_id, 'you''re kinda easy to talk to, that''s probably why', 11),
      (cat_id, 'I don''t usually get like this talking to people', 12),
      (cat_id, 'something about this convo feels different', 13),
      (cat_id, 'I''m more comfortable than I expected', 14),
      (cat_id, 'I didn''t think I''d open up like this', 15)
    on conflict do nothing;
  end if;

  -- OH_WAIT_THERES_MORE
  select id into cat_id from emotional_categories where internal_key='OH_WAIT_THERES_MORE';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'wait there''s more 😭', 1),
      (cat_id, 'okay wait I forgot about the other ones', 2),
      (cat_id, 'hold on I took more actually', 3),
      (cat_id, 'waittt I didn''t even send the best ones yet', 4),
      (cat_id, 'okay no there''s still more from earlier', 5),
      (cat_id, 'I accidentally took a whole bunch', 6),
      (cat_id, 'wait I kept going after that 😭', 7),
      (cat_id, 'okay I definitely took too many', 8),
      (cat_id, 'there are more but they get more embarrassing', 9),
      (cat_id, 'wait the later ones are actually better', 10),
      (cat_id, 'okay hold on there''s another one', 11),
      (cat_id, 'I literally forgot I had more', 12),
      (cat_id, 'wait I have a whole sequence 😭', 13),
      (cat_id, 'I kept saying ''one more''', 14),
      (cat_id, 'there''s actually a bunch from tonight', 15)
    on conflict do nothing;
  end if;

  -- NATURAL_INTERRUPTIONS (safer defaults — no fake emergencies)
  select id into cat_id from emotional_categories where internal_key='NATURAL_INTERRUPTIONS';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'I should probably disappear for a bit', 1),
      (cat_id, 'I was only supposed to be here for a little', 2),
      (cat_id, 'I should get going soon', 3),
      (cat_id, 'I didn''t mean to stay this long', 4),
      (cat_id, 'I kinda want to keep talking though', 5),
      (cat_id, 'I was literally about to leave', 6),
      (cat_id, 'wait now I don''t want to go yet', 7),
      (cat_id, 'you made this harder than it needed to be 😭', 8),
      (cat_id, 'I should stop before I get too comfortable', 9),
      (cat_id, 'okay one more minute and then I''m disappearing', 10)
    on conflict do nothing;
  end if;
end $$;

commit;

-- ============================================================================
-- VERIFY
-- ============================================================================
do $$
declare
  cat_count integer;
  ex_count integer;
begin
  select count(*) into cat_count from emotional_categories;
  select count(*) into ex_count from emotional_category_examples;
  raise notice '── EMOTIONAL ENGINE MIGRATION OK ──';
  raise notice 'emotional_categories: %', cat_count;
  raise notice 'emotional_category_examples: %', ex_count;
end $$;
