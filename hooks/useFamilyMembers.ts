import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

export type FamilyMember = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  date_of_birth?: string;
  notes?: string;
  color: string;
  created_at: string;
};

export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: true });
      setMembers(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const addMember = async (member: Pick<FamilyMember, 'name' | 'relationship' | 'color' | 'date_of_birth' | 'notes'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('family_members')
      .insert({ ...member, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      setMembers(prev => [...prev, data]);
      return data as FamilyMember;
    }
    return null;
  };

  const updateMember = async (id: string, updates: Partial<Pick<FamilyMember, 'name' | 'relationship' | 'color' | 'date_of_birth' | 'notes'>>) => {
    const { error } = await supabase
      .from('family_members')
      .update(updates)
      .eq('id', id);
    if (!error) setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    return !error;
  };

  const deleteMember = async (id: string) => {
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    if (!error) setMembers(prev => prev.filter(m => m.id !== id));
    return !error;
  };

  return { members, loading, refetch, addMember, updateMember, deleteMember };
}

export function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
