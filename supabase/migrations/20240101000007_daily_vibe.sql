-- ============================================================
-- ChatSpace — Daily Vibe System
-- Per-user-per-persona emotional mood of the day. Generated once
-- per local day based on relationship stage + days-since-last-talk +
-- randomness. User never sees the value directly — it's injected
-- into the system prompt so Claude responds accordingly.
-- ADDITIVE ONLY.
-- ============================================================

create table if not exists persona_daily_vibes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  vibe_date date not null,
  vibe text not null,                       -- playful|calm|affectionate|clingy|distant|flirty|vulnerable|excited|shy|missing_you
  intensity numeric(3,2) not null default 0.6,   -- 0-1, how strong the mood is today
  relationship_level_at_time integer,
  days_since_last_talk integer,
  rationale text,                           -- why this vibe was picked (debug)
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, persona_id, vibe_date)
);

create index if not exists idx_daily_vibes_user on persona_daily_vibes(user_id, persona_id, vibe_date desc);

alter table persona_daily_vibes enable row level security;
create policy "Users can view own vibes"
  on persona_daily_vibes for select using (auth.uid() = user_id);
create policy "Service role manages vibes"
  on persona_daily_vibes for all using (auth.role() = 'service_role');
