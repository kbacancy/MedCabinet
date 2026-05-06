import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

export type SymptomLog = {
  id: string;
  user_id: string;
  medicine_id: string | null;
  rating: number;
  note: string | null;
  date: string;
  logged_at: string;
};

export const RATING_FACES = ['', '😖', '😟', '😐', '🙂', '😄'];
export const RATING_LABELS = ['', 'Very bad', 'Bad', 'Okay', 'Good', 'Great'];

export function useSymptomLogs() {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(100);
      setLogs(data ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect fires on mount; useFocusEffect refetches when returning from add modal
  useEffect(() => { refetch(); }, [refetch]);
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const addLog = async (params: { medicine_id: string | null; rating: number; note: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('symptom_logs')
      .insert({
        user_id: user.id,
        medicine_id: params.medicine_id || null,
        rating: params.rating,
        note: params.note.trim() || null,
        date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
    if (!error && data) return data as SymptomLog;
    return null;
  };

  const deleteLog = async (id: string) => {
    await supabase.from('symptom_logs').delete().eq('id', id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  return { logs, loading, refetch, addLog, deleteLog };
}
