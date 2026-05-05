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
