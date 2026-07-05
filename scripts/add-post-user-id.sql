-- Run once in Supabase SQL Editor so new posts persist their author.
-- Until this runs, the app assigns demo profile usernames to seed posts
-- and remembers authors you create in this browser via localStorage.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
