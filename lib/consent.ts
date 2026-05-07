import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export type ConsentType = 'PDF_REPORT_GENERATION';

// Bump this version string any time the consent text wording changes.
// Existing records retain the old version; new ones get the new version.
const CONSENT_VERSIONS: Record<ConsentType, string> = {
  PDF_REPORT_GENERATION: '1.0.0',
};

export const CONSENT_TEXT: Record<ConsentType, string> = {
  PDF_REPORT_GENERATION:
    'I understand this PDF contains my personal health information including ' +
    'my medications, dosage history, medical ID, and emergency contacts. ' +
    'I consent to generating and sharing this report. I acknowledge that once ' +
    'shared outside MedCabinet, the app cannot control how this data is stored, ' +
    'forwarded, or accessed by third parties.',
};

export interface PhiScope {
  medicines_count: number;
  includes_medical_id: boolean;
  includes_contacts: boolean;
  includes_dose_logs: boolean;
  report_period_days: number;
}

export async function recordConsent(
  type: ConsentType,
  phiScope: PhiScope
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('consent_records').insert({
    user_id: user.id,
    consent_type: type,
    consent_version: CONSENT_VERSIONS[type],
    consent_text: CONSENT_TEXT[type],
    phi_scope: phiScope,
    consent_method: 'CHECKBOX',
    platform: Platform.OS,
    app_version: Constants.expoConfig?.version ?? 'unknown',
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
