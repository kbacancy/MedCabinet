import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

export type MemberPreview = { name: string; relationship: string; color: string };

export type CaregiverLink = {
  id: string;
  caregiver_user_id: string | null;
  member_id: string;
  invited_by: string;
  invited_email: string;
  status: 'pending' | 'accepted' | 'revoked';
  invite_token: string;
  created_at: string;
  accepted_at: string | null;
  family_members: MemberPreview | null;
};

export function useCaregiverLinks() {
  const [sentInvites, setSentInvites] = useState<CaregiverLink[]>([]);
  const [myAccess, setMyAccess] = useState<CaregiverLink[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [sentRes, accessRes] = await Promise.all([
        supabase
          .from('caregiver_links')
          .select('*, family_members(name, relationship, color)')
          .eq('invited_by', user.id)
          .neq('status', 'revoked')
          .order('created_at', { ascending: false }),
        supabase
          .from('caregiver_links')
          .select('*, family_members(name, relationship, color)')
          .eq('caregiver_user_id', user.id)
          .eq('status', 'accepted')
          .order('accepted_at', { ascending: false }),
      ]);
      setSentInvites((sentRes.data as CaregiverLink[]) ?? []);
      setMyAccess((accessRes.data as CaregiverLink[]) ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const createInvite = async (memberId: string, email: string): Promise<CaregiverLink | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('caregiver_links')
      .insert({ member_id: memberId, invited_by: user.id, invited_email: email.trim() })
      .select('*, family_members(name, relationship, color)')
      .single();
    if (!error && data) {
      setSentInvites(prev => [data as CaregiverLink, ...prev]);
      return data as CaregiverLink;
    }
    return null;
  };

  const revokeInvite = async (linkId: string) => {
    await supabase.from('caregiver_links').update({ status: 'revoked' }).eq('id', linkId);
    setSentInvites(prev => prev.filter(l => l.id !== linkId));
  };

  const acceptInvite = async (token: string): Promise<{ success: boolean; memberId?: string; error?: string }> => {
    const { data, error } = await supabase.rpc('accept_caregiver_invite', { p_token: token.trim() });
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'Unknown error' };
    await refetch();
    return { success: true, memberId: data.member_id };
  };

  const getInvitePreview = async (token: string): Promise<{ valid: boolean; memberName?: string; status?: string }> => {
    const { data } = await supabase.rpc('get_invite_preview', { p_token: token.trim() });
    if (!data?.valid) return { valid: false };
    return { valid: true, memberName: data.member_name, status: data.status };
  };

  return { sentInvites, myAccess, loading, refetch, createInvite, revokeInvite, acceptInvite, getInvitePreview };
}
