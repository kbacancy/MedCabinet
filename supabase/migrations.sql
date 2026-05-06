-- Run these in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: all statements are idempotent.

-- 1. Extend medicines table with prescription + schedule fields
ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS doctor_name    text,
  ADD COLUMN IF NOT EXISTS pharmacy       text,
  ADD COLUMN IF NOT EXISTS rx_number      text,
  ADD COLUMN IF NOT EXISTS notes          text,
  ADD COLUMN IF NOT EXISTS times_per_day  integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reminder_times text[] DEFAULT '{09:00}';

-- 2. Dose logs — one row per medicine taken per day
CREATE TABLE IF NOT EXISTS dose_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id) ON DELETE CASCADE,
  taken_at    timestamptz DEFAULT now(),
  date        date DEFAULT current_date
);
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own dose logs" ON dose_logs FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Medical ID — one row per user (emergency info)
CREATE TABLE IF NOT EXISTS medical_id (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  blood_type              text,
  allergies               text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  notes                   text,
  updated_at              timestamptz DEFAULT now()
);
ALTER TABLE medical_id ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own medical ID" ON medical_id FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Contacts — doctors, pharmacies, specialists
CREATE TABLE IF NOT EXISTS contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  role       text,
  phone      text,
  address    text,
  notes      text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Family members — managed dependents under a user account
CREATE TABLE IF NOT EXISTS family_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  relationship  text DEFAULT 'Family',
  date_of_birth date,
  notes         text,
  color         text DEFAULT '#1D9E75',
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own family members" ON family_members FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Avatar storage bucket + policies
-- Run this ONCE in SQL Editor (bucket itself is better created via Dashboard → Storage → New bucket named "avatars", set Public)
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
EXCEPTION WHEN unique_violation THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Avatars are publicly readable"   ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users upload own avatar"         ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users update own avatar"         ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users delete own avatar"         ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Scope medicines and dose_logs to family members
-- NULL member_id = primary user's record; non-null = family member's record
ALTER TABLE medicines  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES family_members(id) ON DELETE CASCADE;
ALTER TABLE dose_logs  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES family_members(id) ON DELETE CASCADE;

-- 8. Symptom journal — log daily wellbeing, optionally linked to a medicine
CREATE TABLE IF NOT EXISTS symptom_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id) ON DELETE SET NULL,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note        text,
  date        date NOT NULL DEFAULT current_date,
  logged_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own symptom logs" ON symptom_logs FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS symptom_logs_user_date ON symptom_logs (user_id, date DESC);

-- 9. Caregiver Mode — invite a trusted person to monitor a family member's medicines
CREATE TABLE IF NOT EXISTS caregiver_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id         uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  invited_by        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email     text NOT NULL,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invite_token      text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  UNIQUE NULLS NOT DISTINCT (caregiver_user_id, member_id)
);
ALTER TABLE caregiver_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Owner and caregiver manage links" ON caregiver_links
    FOR ALL USING (auth.uid() = invited_by OR auth.uid() = caregiver_user_id)
    WITH CHECK (auth.uid() = invited_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC: accept an invite — runs as SECURITY DEFINER to bypass RLS for the token lookup
CREATE OR REPLACE FUNCTION accept_caregiver_invite(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  link caregiver_links;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  UPDATE caregiver_links
    SET caregiver_user_id = auth.uid(), status = 'accepted', accepted_at = now()
    WHERE invite_token = p_token AND status = 'pending'
    RETURNING * INTO link;
  IF link.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used invite');
  END IF;
  RETURN jsonb_build_object('success', true, 'member_id', link.member_id::text);
END;
$$;

-- RPC: preview invite info before accepting (no sensitive data exposed)
CREATE OR REPLACE FUNCTION get_invite_preview(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  member_name text;
  link_status text;
BEGIN
  SELECT fm.name, cl.status
    INTO member_name, link_status
    FROM caregiver_links cl
    JOIN family_members fm ON fm.id = cl.member_id
    WHERE cl.invite_token = p_token;
  IF member_name IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  RETURN jsonb_build_object('valid', true, 'member_name', member_name, 'status', link_status);
END;
$$;

-- Secondary RLS: caregivers can read data for their linked family members
DO $$ BEGIN
  CREATE POLICY "Caregivers read linked family members" ON family_members FOR SELECT
    USING (id IN (SELECT member_id FROM caregiver_links WHERE caregiver_user_id = auth.uid() AND status = 'accepted'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Caregivers read linked medicines" ON medicines FOR SELECT
    USING (member_id IN (SELECT member_id FROM caregiver_links WHERE caregiver_user_id = auth.uid() AND status = 'accepted'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Caregivers read linked dose logs" ON dose_logs FOR SELECT
    USING (member_id IN (SELECT member_id FROM caregiver_links WHERE caregiver_user_id = auth.uid() AND status = 'accepted'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
