-- Add is_admin role to profiles
alter table profiles add column if not exists is_admin boolean not null default false;

-- To set yourself as admin, run in Supabase SQL editor after signing up:
-- update profiles set is_admin = true where id = (
--   select id from auth.users where email = 'your@email.com'
-- );
