import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

export type DoseLog = {
  id: string;
  user_id: string;
  medicine_id: string;
  taken_at: string;
  date: string;
};

export function useTodayDoseLogs() {
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('date', today);
    setLoading(false);
    setLogs(data ?? []);
  }, [today]);

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
      .select()
      .single();
    if (!error && data) setLogs(prev => [...prev, data]);
  };

  const unmarkTaken = async (medicineId: string) => {
    const log = logs.find(l => l.medicine_id === medicineId);
    if (!log) return;
    await supabase.from('dose_logs').delete().eq('id', log.id);
    setLogs(prev => prev.filter(l => l.id !== log.id));
  };

  return { logs, loading, isTaken, markTaken, unmarkTaken, refetch };
}

export function useDoseLogRange(startDate: string, endDate: string) {
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('dose_logs')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      setLogs(data ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, loading, refetch: fetch };
}
