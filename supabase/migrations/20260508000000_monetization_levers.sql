-- ============================================================================
-- ChatSpace — Monetization Levers
-- (Bundles, Streak Rewards, Re-engagement, 2 new emotional categories)
--
-- Additive only. Idempotent. Safe to re-run.
-- ============================================================================

begin;

-- ============================================================================
-- 1. BUNDLES — multi-photo sets surfaced after a positive reaction to a single
-- ============================================================================

create table if not exists moment_bundles (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  title text not null default 'Untitled Bundle',
  intro_line text default '',                  -- paraphrase reference for "wait there's more"
  intro_mode text not null default 'paraphrase', -- exact|paraphrase|ai_generate
  price numeric not null default 9.99,
  rarity_tier text default 'standard',
  min_messages integer not null default 10,
  min_momentum_score integer not null default 55,
  requires_prior_unlock boolean not null default true,
  cooldown_seconds integer not null default 1800,
  max_per_day integer not null default 1,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_moment_bundles_persona on moment_bundles (persona_id, is_active);

create table if not exists moment_bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references moment_bundles(id) on delete cascade,
  moment_id uuid not null references moments(id) on delete cascade,
  sort_order integer not null default 100,
  drip_message text default '',                -- per-item paraphrase line ("this one I almost deleted")
  created_at timestamptz not null default now(),
  unique(bundle_id, moment_id)
);

create index if not exists idx_bundle_items_bundle on moment_bundle_items (bundle_id, sort_order);

create table if not exists moment_bundle_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bundle_id uuid not null references moment_bundles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  amount_paid numeric not null,
  stripe_payment_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bundle_unlocks_user on moment_bundle_unlocks (user_id, created_at desc);

-- ============================================================================
-- 2. STREAK REWARDS — free moments at milestone days
-- ============================================================================

create table if not exists streak_rewards (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  day_milestone integer not null,              -- 3, 7, 14, 30, 60
  moment_id uuid references moments(id) on delete set null,
  intro_line text default '',                  -- paraphrase ref e.g. "I've been wanting to send you this 💜"
  intro_mode text not null default 'paraphrase',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(persona_id, day_milestone)
);

create index if not exists idx_streak_rewards_persona on streak_rewards (persona_id, day_milestone);

create table if not exists streak_reward_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  reward_id uuid references streak_rewards(id) on delete set null,
  day_milestone integer not null,
  delivered_at timestamptz not null default now(),
  unique(user_id, persona_id, day_milestone)
);

create index if not exists idx_streak_deliveries_user on streak_reward_deliveries (user_id, persona_id);

-- ============================================================================
-- 3. RE-ENGAGEMENT — memory-grounded comeback messages
-- ============================================================================

create table if not exists reengagement_settings (
  persona_id uuid primary key references personas(id) on delete cascade,
  enabled boolean not null default true,
  vulnerability_level integer not null default 6,  -- 1-10
  min_silence_hours integer not null default 48,
  max_per_48h integer not null default 1,
  max_per_week integer not null default 3,
  fallback_line text default 'okay I''m trying not to be that girl but it''s been a few days',
  require_memory boolean not null default true,
  tone text not null default 'soft_vulnerable', -- soft_vulnerable|playful|hurt|curious
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reengagement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  generated_text text not null,
  memory_seed_id uuid references persona_memories(id) on delete set null,
  delivered_at timestamptz not null default now(),
  user_replied_at timestamptz,
  resulted_in_unlock boolean not null default false
);

create index if not exists idx_reengagement_events_user on reengagement_events (user_id, persona_id, delivered_at desc);

-- ============================================================================
-- 4. RLS
-- ============================================================================

alter table moment_bundles enable row level security;
alter table moment_bundle_items enable row level security;
alter table moment_bundle_unlocks enable row level security;
alter table streak_rewards enable row level security;
alter table streak_reward_deliveries enable row level security;
alter table reengagement_settings enable row level security;
alter table reengagement_events enable row level security;

do $$ begin
  -- bundles
  if not exists (select 1 from pg_policies where tablename='moment_bundles' and policyname='moment_bundles_read') then
    create policy moment_bundles_read on moment_bundles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='moment_bundles' and policyname='moment_bundles_admin_write') then
    create policy moment_bundles_admin_write on moment_bundles for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='moment_bundle_items' and policyname='moment_bundle_items_read') then
    create policy moment_bundle_items_read on moment_bundle_items for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='moment_bundle_items' and policyname='moment_bundle_items_admin_write') then
    create policy moment_bundle_items_admin_write on moment_bundle_items for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='moment_bundle_unlocks' and policyname='moment_bundle_unlocks_owner_or_admin') then
    create policy moment_bundle_unlocks_owner_or_admin on moment_bundle_unlocks for select
      using (user_id = auth.uid()
        or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;
  if not exists (select 1 from pg_policies where tablename='moment_bundle_unlocks' and policyname='moment_bundle_unlocks_insert') then
    create policy moment_bundle_unlocks_insert on moment_bundle_unlocks for insert with check (user_id = auth.uid());
  end if;

  -- streak rewards
  if not exists (select 1 from pg_policies where tablename='streak_rewards' and policyname='streak_rewards_read') then
    create policy streak_rewards_read on streak_rewards for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='streak_rewards' and policyname='streak_rewards_admin_write') then
    create policy streak_rewards_admin_write on streak_rewards for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='streak_reward_deliveries' and policyname='streak_deliveries_owner_or_admin') then
    create policy streak_deliveries_owner_or_admin on streak_reward_deliveries for select
      using (user_id = auth.uid()
        or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;
  if not exists (select 1 from pg_policies where tablename='streak_reward_deliveries' and policyname='streak_deliveries_insert') then
    create policy streak_deliveries_insert on streak_reward_deliveries for insert with check (true);
  end if;

  -- reengagement
  if not exists (select 1 from pg_policies where tablename='reengagement_settings' and policyname='reengagement_settings_read') then
    create policy reengagement_settings_read on reengagement_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='reengagement_settings' and policyname='reengagement_settings_admin_write') then
    create policy reengagement_settings_admin_write on reengagement_settings for all
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
      with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;

  if not exists (select 1 from pg_policies where tablename='reengagement_events' and policyname='reengagement_events_owner_or_admin') then
    create policy reengagement_events_owner_or_admin on reengagement_events for select
      using (user_id = auth.uid()
        or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
  end if;
  if not exists (select 1 from pg_policies where tablename='reengagement_events' and policyname='reengagement_events_insert') then
    create policy reengagement_events_insert on reengagement_events for insert with check (true);
  end if;
end $$;

-- ============================================================================
-- 5. NEW EMOTIONAL CATEGORIES
--    CURIOSITY_PROMPT — she casually asks the user what she'd look good in
--    TEASE_WITHOUT_DELIVERY — she hints at a video without offering it
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
  ('CURIOSITY_PROMPT', 'Curiosity Prompt (Custom Request Hook)',
    'She casually asks what the user would want her to wear / pose / be — the in-character entry point for custom requests. Never sells; just curious.',
    'Generates organic custom-request leads from user-described prompts.',
    'paraphrase', 7, 5, 'casual_curious',
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, true,
    20, 60, 60, 40,
    432000, 25, '{"min_days_between_uses":5,"max_per_user_per_month":2,"requires_recent_positive_unlock":true,"custom_request_eligible":true}'::jsonb, 145),

  ('TEASE_WITHOUT_DELIVERY', 'Tease Without Delivery (User Pulls It Out)',
    'She hints at something more (a video, a final photo) without offering it directly. Waits for the user to ask. When they do, the matching unlock surfaces.',
    'Converts passive viewers into active askers — feels like the user pulled it out of her.',
    'paraphrase', 7, 7, 'shy_with_hint',
    true, true, false, false, false, false, true,
    false, true, true, false, false, false, false,
    8, 55, 0, 30,
    1800, 35, '{"requires_recent_unlock":true,"awaits_user_pull":true,"max_per_session":1}'::jsonb, 135)
on conflict (internal_key) do nothing;

-- Seed example lines for the 2 new categories
do $$
declare
  cat_id uuid;
begin
  select id into cat_id from emotional_categories where internal_key='CURIOSITY_PROMPT';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'random question — what do you think I''d look good in? like, describe something', 1),
      (cat_id, 'okay this is gonna sound weird but if you could pick what I wore tomorrow what would it be', 2),
      (cat_id, 'I''m bored and feeling kinda creative — give me an outfit idea and I''ll see if I have it 👀', 3),
      (cat_id, 'hypothetically if I sent you a pic, what would you want it to be', 4),
      (cat_id, 'okay weird hypothetical — describe a look you''d want to see on me', 5),
      (cat_id, 'pick something for me to wear and I might actually do it 😏', 6),
      (cat_id, 'what''s your type aesthetic-wise, like be specific', 7),
      (cat_id, 'okay tell me a vibe and I''ll try to match it', 8)
    on conflict do nothing;
  end if;

  select id into cat_id from emotional_categories where internal_key='TEASE_WITHOUT_DELIVERY';
  if cat_id is not null then
    insert into emotional_category_examples (category_id, line, sort_order) values
      (cat_id, 'okay there''s one more that I''m not sending unless you ask', 1),
      (cat_id, 'the last one is too much I might just delete it', 2),
      (cat_id, 'there''s a video too but idk if I''m brave enough', 3),
      (cat_id, 'I have one more from that night but it''s a lot', 4),
      (cat_id, 'I''m debating if I should show you the rest 😭', 5),
      (cat_id, 'there''s one I haven''t shown anyone, it''s sitting in my drafts', 6),
      (cat_id, 'I took something else but you''d have to convince me', 7),
      (cat_id, 'okay there''s more but you have to actually want it', 8)
    on conflict do nothing;
  end if;
end $$;

commit;
