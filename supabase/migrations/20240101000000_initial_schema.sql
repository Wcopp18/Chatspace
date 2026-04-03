-- ChatSpace MVP Schema
-- Run this in your Supabase SQL editor or via `supabase db push`

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  is_subscribed boolean not null default false,
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- PERSONAS
-- ============================================================
create table if not exists personas (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  display_name text not null,
  bio text,
  avatar_url text,
  warmth integer not null default 7 check (warmth between 1 and 10),
  tease_level integer not null default 5 check (tease_level between 1 and 10),
  texting_style text not null default 'playful',
  emoji_style text not null default 'moderate', -- none | moderate | heavy
  sentence_length text not null default 'short', -- short | medium | long
  pacing_style text not null default 'responsive',
  continuation_style text not null default 'emotional',
  continuation_frequency integer not null default 30, -- minutes cooldown
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table personas enable row level security;

create policy "Anyone can view active personas"
  on personas for select using (is_active = true);

create policy "Service role can manage personas"
  on personas for all using (auth.role() = 'service_role');

-- ============================================================
-- PERSONA PHRASE BANK
-- ============================================================
create table if not exists persona_phrase_bank (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  phrase_type text not null, -- intro | signature | pet_name | teaser | upsell | continuation
  phrase text not null,
  weight integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table persona_phrase_bank enable row level security;

create policy "Anyone can view active phrases"
  on persona_phrase_bank for select using (is_active = true);

create policy "Service role can manage phrases"
  on persona_phrase_bank for all using (auth.role() = 'service_role');

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  message_count integer not null default 0,
  emotion_score numeric(3,2) not null default 0.00,
  last_continuation_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "Users can view own conversations"
  on conversations for select using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on conversations for insert with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on conversations for update using (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Users can view messages in own conversations"
  on messages for select using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own conversations"
  on messages for insert with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- ============================================================
-- MOMENTS
-- ============================================================
create table if not exists moments (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  title text not null,
  tease_copy text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  media_url text,
  thumbnail_url text,
  price numeric(6,2) not null default 2.99,
  expires_at timestamptz,
  lock_state text not null default 'locked' check (lock_state in ('locked', 'unlocked')),
  auto_move_to_sidebar boolean not null default true,
  sidebar_delay_minutes integer not null default 10,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table moments enable row level security;

create policy "Anyone can view active moments"
  on moments for select using (is_active = true);

create policy "Service role can manage moments"
  on moments for all using (auth.role() = 'service_role');

-- ============================================================
-- MOMENT UNLOCKS
-- ============================================================
create table if not exists moment_unlocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  moment_id uuid not null references moments(id) on delete cascade,
  amount_paid numeric(6,2) not null,
  stripe_payment_id text,
  created_at timestamptz not null default now(),
  unique(user_id, moment_id)
);

alter table moment_unlocks enable row level security;

create policy "Users can view own unlocks"
  on moment_unlocks for select using (auth.uid() = user_id);

create policy "Users can insert own unlocks"
  on moment_unlocks for insert with check (auth.uid() = user_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  status text not null default 'inactive',
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select using (auth.uid() = user_id);

-- ============================================================
-- PERSONA MEMORIES
-- ============================================================
create table if not exists persona_memories (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null,
  memory_value text not null,
  importance integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(persona_id, user_id, memory_key)
);

alter table persona_memories enable row level security;

create policy "Users can view own memories"
  on persona_memories for select using (auth.uid() = user_id);

create policy "Users can manage own memories"
  on persona_memories for all using (auth.uid() = user_id);

-- ============================================================
-- CREATOR SETTINGS
-- ============================================================
create table if not exists creator_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text not null unique,
  setting_value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table creator_settings enable row level security;

create policy "Service role can manage creator settings"
  on creator_settings for all using (auth.role() = 'service_role');

-- ============================================================
-- PERSONA ASSETS
-- ============================================================
create table if not exists persona_assets (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  asset_type text not null, -- avatar | banner | moment_media
  asset_url text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table persona_assets enable row level security;

create policy "Anyone can view persona assets"
  on persona_assets for select using (true);

create policy "Service role can manage persona assets"
  on persona_assets for all using (auth.role() = 'service_role');

-- ============================================================
-- CONTINUATION PROMPTS
-- ============================================================
create table if not exists continuation_prompts (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  trigger_type text not null default 'message_count', -- message_count | emotion_score | time
  continuation_line text not null,
  popup_cta text not null,
  price numeric(6,2) not null default 2.00,
  cooldown_minutes integer not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table continuation_prompts enable row level security;

create policy "Anyone can view active continuation prompts"
  on continuation_prompts for select using (is_active = true);

create policy "Service role can manage continuation prompts"
  on continuation_prompts for all using (auth.role() = 'service_role');

-- ============================================================
-- CONTINUATION UNLOCKS
-- ============================================================
create table if not exists continuation_unlocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  prompt_id uuid not null references continuation_prompts(id) on delete cascade,
  amount_paid numeric(6,2) not null,
  stripe_payment_id text,
  created_at timestamptz not null default now()
);

alter table continuation_unlocks enable row level security;

create policy "Users can view own continuation unlocks"
  on continuation_unlocks for select using (auth.uid() = user_id);

create policy "Users can insert own continuation unlocks"
  on continuation_unlocks for insert with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('moments', 'moments', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

create policy "Anyone can view avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Anyone can view thumbnails"
  on storage.objects for select using (bucket_id = 'thumbnails');

create policy "Service role can manage moments storage"
  on storage.objects for all using (bucket_id = 'moments' and auth.role() = 'service_role');

create policy "Authenticated users can view unlocked moments"
  on storage.objects for select using (
    bucket_id = 'moments' and auth.role() = 'authenticated'
  );
