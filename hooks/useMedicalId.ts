import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type MedicalId = {
  id?: string;
  user_id?: string;
  blood_type: string;
  allergies: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
};

const EMPTY: MedicalId = {
  blood_type: '',
  allergies: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  notes: '',
};

export function useMedicalId() {
  const [medicalId, setMedicalId] = useState<MedicalId>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('medical_id')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setMedicalId(data ?? EMPTY);
      setLoading(false);
    })();
  }, []);

  const save = async (values: MedicalId): Promise<boolean> => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return false; }
    const { error } = await supabase
      .from('medical_id')
      .upsert(
        { ...values, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    setSaving(false);
    if (!error) setMedicalId(values);
    return !error;
  };

  return { medicalId, loading, saving, save };
}
