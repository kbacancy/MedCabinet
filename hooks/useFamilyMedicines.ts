import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import type { Medicine } from './useMedicines';

export function useFamilyMedicines(memberId: string) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('medicines')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    setLoading(false);
    setMedicines(data ?? []);
  }, [memberId]);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  return { medicines, loading, refetch };
}

export function useFamilyDoseLogs(medicineIds: string[]) {
  const [logs, setLogs] = useState<{ id: string; medicine_id: string; date: string }[]>([]);
  const today = new Date().toISOString().split('T')[0];
  const idsKey = medicineIds.slice().sort().join(',');

  const refetch = useCallback(async () => {
    if (medicineIds.length === 0) { setLogs([]); return; }
    const { data } = await supabase
      .from('dose_logs')
      .select('id, medicine_id, date')
      .in('medicine_id', medicineIds)
      .eq('date', today);
    setLogs(data ?? []);
  }, [idsKey, today]);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const isTaken = useCallback(
    (medicineId: string) => logs.some(l => l.medicine_id === medicineId),
    [logs]
  );

  const markTaken = async (medicineId: string) => {
    if (isTaken(medicineId)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('dose_logs')
      .insert({ user_id: user.id, medicine_id: medicineId, date: today })
      .select('id, medicine_id, date')
      .single();
    if (!error && data) setLogs(prev => [...prev, data]);
  };

  const unmarkTaken = async (medicineId: string) => {
    const log = logs.find(l => l.medicine_id === medicineId);
    if (!log) return;
    await supabase.from('dose_logs').delete().eq('id', log.id);
    setLogs(prev => prev.filter(l => l.id !== log.id));
  };

  return { isTaken, markTaken, unmarkTaken, refetch };
}
