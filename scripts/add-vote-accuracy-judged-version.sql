-- Optional migration: track which consensus version each vote was accuracy-judged against.
-- Prevents double-penalizing/rewarding when consensus flips. Safe to run once on hosted Supabase.

ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS accuracy_judged_consensus_version integer NOT NULL DEFAULT 0;

GRANT SELECT, INSERT, UPDATE ON votes TO service_role;
