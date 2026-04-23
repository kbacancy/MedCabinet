import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

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

export function useMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) setError(error.message);
    else setMedicines(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return { medicines, loading, error, refetch };
}

export function daysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return 9999;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
