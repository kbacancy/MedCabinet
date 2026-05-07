-- HIPAA Consent Records Table
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Stores every explicit user consent event with full audit trail.
-- Records are immutable — no UPDATE or DELETE policies.

CREATE TABLE IF NOT EXISTS consent_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What the user consented to
  consent_type     text NOT NULL,   -- e.g. 'PDF_REPORT_GENERATION'
  consent_version  text NOT NULL,   -- version of consent text shown, bump on any wording change
  consent_text     text NOT NULL,   -- exact text the user read and agreed to (snapshot)

  -- What PHI was included at time of consent
  phi_scope        jsonb NOT NULL DEFAULT '{}',
  -- e.g. { medicines_count: 5, includes_medical_id: true, includes_contacts: true, report_period_days: 30 }

  -- How they consented
  consent_method   text NOT NULL DEFAULT 'CHECKBOX',  -- 'CHECKBOX' | 'SIGNATURE' | 'BIOMETRIC'
  consented_at     timestamptz NOT NULL DEFAULT now(),

  -- Device context (no IP for mobile — use platform instead)
  platform         text,   -- 'ios' | 'android'
  app_version      text
);

-- RLS: users can read and insert their own consent records only
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own consent records" ON consent_records
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert own consent records" ON consent_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No UPDATE or DELETE — consent records are legally immutable
CREATE INDEX IF NOT EXISTS consent_records_user_time
  ON consent_records (user_id, consented_at DESC);
