-- HIPAA Audit Log Table
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Immutable append-only log of all PHI access and mutations.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,        -- e.g. 'READ', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CAREGIVER_ACCESS'
  resource    text NOT NULL,        -- e.g. 'medicines', 'medical_id', 'dose_logs', 'symptom_logs'
  resource_id text,                 -- uuid of the specific record if applicable
  metadata    jsonb DEFAULT '{}',   -- extra context (member_id, category, etc) — never store PHI values here
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can only read their own audit logs; inserts are allowed for self
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert own audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No UPDATE or DELETE allowed — audit logs are immutable
-- Index for fast lookup by user and time
CREATE INDEX IF NOT EXISTS audit_logs_user_time ON audit_logs (user_id, created_at DESC);
