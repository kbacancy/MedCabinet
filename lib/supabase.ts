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
