import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export type ConsentType =
  | 'PDF_REPORT_GENERATION'
  | 'CSV_EXPORT'
  | 'GROQ_AI_DATA_SHARING'
  | 'CAREGIVER_INVITE_OWNER'
  | 'CAREGIVER_ACCESS_ACCEPTANCE';

// Bump version any time consent wording changes — old records keep their version
const CONSENT_VERSIONS: Record<ConsentType, string> = {
  PDF_REPORT_GENERATION:     '1.0.0',
  CSV_EXPORT:                '1.0.0',
  GROQ_AI_DATA_SHARING:      '1.0.0',
  CAREGIVER_INVITE_OWNER:    '1.0.0',
  CAREGIVER_ACCESS_ACCEPTANCE: '1.0.0',
};

export const CONSENT_TEXT: Record<ConsentType, string> = {
  PDF_REPORT_GENERATION:
    'I understand this PDF contains my personal health information including ' +
    'my medications, dosage history, medical ID, and emergency contacts. ' +
    'I consent to generating and sharing this report. I acknowledge that once ' +
    'shared outside MedCabinet, the app cannot control how this data is stored, ' +
    'forwarded, or accessed by third parties.',

  CSV_EXPORT:
    'I understand this export contains my full medicine list including names, ' +
    'dosages, quantities, expiry dates, doctor names, pharmacy, and prescription numbers. ' +
    'I consent to exporting this data. I acknowledge that once shared outside MedCabinet, ' +
    'the app cannot control how this information is stored or accessed by third parties.',

  GROQ_AI_DATA_SHARING:
    'To provide AI-powered drug interaction checks and medication safety features, ' +
    'MedCabinet sends medicine names to Groq AI, a third-party AI service. ' +
    'No personal identifiers (name, date of birth, or contact details) are ever sent. ' +
    'Only medicine names are shared for safety analysis. ' +
    'I consent to my medicine names being sent to Groq AI to enable these features. ' +
    'I can disable AI features at any time in Settings.',

  CAREGIVER_INVITE_OWNER:
    'I consent to sharing the selected family member\'s medicine cabinet, ' +
    'dose history, and adherence data with the caregiver I am inviting. ' +
    'I understand the caregiver will have read-only access to this health information. ' +
    'I can revoke this access at any time from the Caregiver Mode screen.',

  CAREGIVER_ACCESS_ACCEPTANCE:
    'I understand I am being granted access to another person\'s protected health ' +
    'information including their medicines and dose history. ' +
    'I agree to handle this information with strict confidentiality, use it only to ' +
    'support their care, and not share it with any third party. ' +
    'I acknowledge this access can be revoked by the account owner at any time.',
};

// AsyncStorage key prefix for caching one-time consents locally
const CONSENT_CACHE_KEY = (type: ConsentType) => `consent_given_${type}`;

export interface PhiScope {
  medicines_count?: number;
  includes_medical_id?: boolean;
  includes_contacts?: boolean;
  includes_dose_logs?: boolean;
  report_period_days?: number;
  member_name?: string;
  caregiver_email?: string;
  [key: string]: string | number | boolean | undefined;
}

export async function recordConsent(
  type: ConsentType,
  phiScope: PhiScope = {}
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

  // Cache locally so repeated checks don't hit the DB
  await AsyncStorage.setItem(CONSENT_CACHE_KEY(type), 'true');
  return { success: true };
}

// Fast consent check — AsyncStorage first, DB fallback
export async function hasGivenConsent(type: ConsentType): Promise<boolean> {
  const cached = await AsyncStorage.getItem(CONSENT_CACHE_KEY(type));
  if (cached === 'true') return true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('consent_records')
    .select('id')
    .eq('user_id', user.id)
    .eq('consent_type', type)
    .limit(1)
    .maybeSingle();

  if (data) {
    await AsyncStorage.setItem(CONSENT_CACHE_KEY(type), 'true');
    return true;
  }
  return false;
}

// Clear cached consent (e.g. on sign-out so next user gets fresh prompts)
export async function clearConsentCache(): Promise<void> {
  const keys = (Object.keys(CONSENT_VERSIONS) as ConsentType[]).map(CONSENT_CACHE_KEY);
  await AsyncStorage.multiRemove(keys);
}
