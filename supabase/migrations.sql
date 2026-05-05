-- Run these in your Supabase SQL Editor (Dashboard → SQL Editor)

-- 1. Extend medicines table with prescription + schedule fields
ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS doctor_name   text,
  ADD COLUMN IF NOT EXISTS pharmacy      text,
  ADD COLUMN IF NOT EXISTS rx_number     text,
  ADD COLUMN IF NOT EXISTS notes         text,
  ADD COLUMN IF NOT EXISTS times_per_day integer DEFAULT 1,
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
CREATE POLICY "Users manage own dose logs"
  ON dose_logs FOR ALL USING (auth.uid() = user_id);

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
CREATE POLICY "Users manage own medical ID"
  ON medical_id FOR ALL USING (auth.uid() = user_id);

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
CREATE POLICY "Users manage own contacts"
  ON contacts FOR ALL USING (auth.uid() = user_id);
