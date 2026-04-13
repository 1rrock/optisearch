-- Add 'analyze' to ai_usage feature check constraint.
-- The old constraint only allowed ('search', 'title', 'draft', 'score').
-- We now replace title+score with analyze, but keep old values for backward compat.

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT con.conname INTO v_constraint
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'ai_usage'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%feature%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE ai_usage DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_check
  CHECK (feature IN ('search', 'title', 'draft', 'score', 'analyze', 'bulk', 'trend'));
