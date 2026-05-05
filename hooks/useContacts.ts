import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

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

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    setContacts(data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const addContact = async (
    contact: Omit<Contact, 'id' | 'user_id' | 'created_at'>
  ): Promise<Contact | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...contact, user_id: user.id })
      .select()
      .single();
    if (!error && data) setContacts(prev => [data, ...prev]);
    return error ? null : data;
  };

  const updateContact = async (id: string, updates: Partial<Contact>): Promise<boolean> => {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) setContacts(prev => prev.map(c => c.id === id ? data : c));
    return !error;
  };

  const deleteContact = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (!error) setContacts(prev => prev.filter(c => c.id !== id));
    return !error;
  };

  return { contacts, loading, refetch, addContact, updateContact, deleteContact };
}
