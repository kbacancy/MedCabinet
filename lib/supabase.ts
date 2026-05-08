import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Medicine = {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  quantity: number;
  expiry_date: string;
  category: string;
  refill_alert_at: number;
  created_at: string;
  // Prescription tracking
  doctor_name?: string;
  pharmacy?: string;
  rx_number?: string;
  notes?: string;
  // Schedule
  times_per_day?: number;
  reminder_times?: string[];
};

export type Alert = {
  id: string;
  user_id: string;
  type: 'interaction' | 'expiry' | 'refill';
  medicine_ids: string[];
  message: string;
  read: boolean;
  created_at: string;
};

export type DoseLog = {
  id: string;
  user_id: string;
  medicine_id: string;
  taken_at: string;
  date: string;
};

export type MedicalId = {
  id?: string;
  user_id?: string;
  blood_type: string;
  allergies: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  updated_at?: string;
};

export type Contact = {
  id: string;
  user_id: string;
  name: string;
  role: string;
  phone: string;
  address?: string;
  notes?: string;
  created_at: string;
};

export type MoodLog = {
  id: string;
  user_id: string;
  primary_mood: string;
  severity: 'mild' | 'moderate' | 'high';
  insight: string | null;
  wellness_message: string | null;
  suggested_action: string | null;
  emoji: string | null;
  energy_level: number | null;
  emotional_state: string | null;
  physical_symptoms: string[] | null;
  trigger_category: string | null;
  sleep_rating: number | null;
  recorded_at: string;
};
