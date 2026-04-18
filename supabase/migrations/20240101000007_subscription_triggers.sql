-- ============================================================
-- ChatSpace Subscription Trigger Events Migration
-- Tracks the "earned first reveal" subscription prompt flow:
-- impressions, dismissals, clicks, trial starts, reveals.
-- ADDITIVE ONLY.
-- ============================================================

create table if not exists subscription_prompt_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  event_type text not null check (event_type in ('impression', 'dismiss', 'click', 'trial_start', 'reveal')),
  chemistry_score numeric(5,2),
  tension_score numeric(5,2),
  relationship_momentum numeric(5,2),
  message_quality_label text,
  context jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_sub_prompt_events_user on subscription_prompt_events(user_id, created_at);
create index if not exists idx_sub_prompt_events_type on subscription_prompt_events(event_type, created_at);

alter table subscription_prompt_events enable row level security;
create policy "Users can view own prompt events" on subscription_prompt_events for select using (auth.uid() = user_id);
create policy "Service role manages prompt events" on subscription_prompt_events for all using (auth.role() = 'service_role');

-- Profile columns for cooldown + first-prompt tracking
alter table profiles add column if not exists first_subscription_prompt_at timestamptz;
alter table profiles add column if not exists subscription_dismissed_until timestamptz;
