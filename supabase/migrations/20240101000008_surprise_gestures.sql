-- ============================================================
-- ChatSpace — Surprise Gesture System
-- Creator-defined free/spontaneous gifts (notes, images, videos, bundles)
-- the girl "just sends" when conditions align.
-- ============================================================

do $$ begin
  create type gesture_type as enum ('note', 'free_image', 'free_video', 'bundle', 'daily_drop');
exception when duplicate_object then null;
end $$;

create table if not exists surprise_gestures (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  gesture_type gesture_type not null,
  content_text text,                         -- required for notes
  media_url text,                            -- required for image/video gestures
  thumbnail_url text,
  caption text,
  min_relationship_level integer not null default 1,
  min_chemistry_band text not null default 'warm',    -- flat|warm|good|hot|electric
  vibe_tags text[] default '{}',             -- vibes this gesture fits; empty = all
  cooldown_hours integer not null default 12,
  weight integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_surprise_gestures_persona on surprise_gestures(persona_id, is_active);

alter table surprise_gestures enable row level security;
create policy "Anyone can view active gestures"
  on surprise_gestures for select using (is_active = true);
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

create index if not exists idx_gesture_deliveries_user on user_surprise_gesture_deliveries(user_id, persona_id, delivered_at desc);

alter table user_surprise_gesture_deliveries enable row level security;
create policy "Users can view own gesture deliveries"
  on user_surprise_gesture_deliveries for select using (auth.uid() = user_id);
create policy "Users can update own deliveries"
  on user_surprise_gesture_deliveries for update using (auth.uid() = user_id);
create policy "Service role manages gesture deliveries"
  on user_surprise_gesture_deliveries for all using (auth.role() = 'service_role');
