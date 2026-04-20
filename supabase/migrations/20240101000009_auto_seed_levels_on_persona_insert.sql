-- ============================================================
-- ChatSpace — Auto-seed default relationship levels on new persona
--
-- Adds a trigger so that any time a new row is inserted into `personas`,
-- the same six default levels (Stranger → Inseparable) are created for
-- that persona. This makes "Add Girl" in the creator panel produce a
-- girl that's immediately usable, matching the seeded behaviour for the
-- three existing girls.
--
-- Idempotent:
--   • CREATE OR REPLACE on the function — safe to re-run.
--   • DROP TRIGGER IF EXISTS before CREATE — safe to re-run.
--   • The function skips inserts if the persona already has any levels,
--     so manual seeding or migrations that pre-populate levels still work.
-- ============================================================

create or replace function seed_default_relationship_levels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Skip if this persona already has levels (seed migration, manual setup, etc.)
  if exists (select 1 from relationship_levels where persona_id = new.id) then
    return new;
  end if;

  insert into relationship_levels
    (persona_id, level_number, name, description, xp_to_complete, color, icon)
  values
    (new.id, 1, 'Stranger',    'You just met. She''s curious.',         80,  '#9CA3AF', '👋'),
    (new.id, 2, 'Flirtation',  'Something''s starting to spark.',      160, '#EC4899', '💫'),
    (new.id, 3, 'Crush',       'She thinks about you between texts.',  260, '#F472B6', '💗'),
    (new.id, 4, 'Chemistry',   'This is no longer casual.',            380, '#A855F7', '🔥'),
    (new.id, 5, 'Obsessed',    'She can''t get you out of her head.',  520, '#8B5CF6', '💘'),
    (new.id, 6, 'Inseparable', 'You''re hers. She''s yours.',          700, '#D946EF', '💞');

  return new;
end;
$$;

drop trigger if exists trg_seed_default_levels on personas;
create trigger trg_seed_default_levels
  after insert on personas
  for each row execute procedure seed_default_relationship_levels();

-- Verification: a quick self-test via NOTICE (safe on re-runs).
do $$
declare
  trigger_ok boolean;
begin
  select exists (
    select 1 from pg_trigger
    where tgname = 'trg_seed_default_levels'
      and tgrelid = 'personas'::regclass
  ) into trigger_ok;

  if not trigger_ok then
    raise exception 'Auto-seed trigger was not created';
  end if;
  raise notice '✓ trg_seed_default_levels is attached to personas.';
end $$;
