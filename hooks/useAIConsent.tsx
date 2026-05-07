import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Colors } from '../constants/colors';
import { hasGivenConsent, recordConsent, CONSENT_TEXT } from '../lib/consent';

type Status = 'checking' | 'needed' | 'granted' | 'declined';

export function useAIConsent() {
  const [status, setStatus] = useState<Status>('checking');
  const [checked, setChecked] = useState(false);
  const resolveRef = useRef<((granted: boolean) => void) | null>(null);

  useEffect(() => {
    hasGivenConsent('GROQ_AI_DATA_SHARING').then(given => {
      setStatus(given ? 'granted' : 'needed');
    });
  }, []);

  const requestConsent = useCallback((): Promise<boolean> => {
    if (status === 'granted') return Promise.resolve(true);
    if (status === 'declined') return Promise.resolve(false);
    // Status is 'needed' — show modal and return a promise resolved by user action
    setChecked(false);
    setStatus('needed');
    return new Promise(resolve => { resolveRef.current = resolve; });
  }, [status]);

  const handleAccept = async () => {
    const { success } = await recordConsent('GROQ_AI_DATA_SHARING', {});
    if (success) {
      setStatus('granted');
      resolveRef.current?.(true);
    }
    resolveRef.current = null;
  };

  const handleDecline = () => {
    setStatus('declined');
    resolveRef.current?.(false);
    resolveRef.current = null;
  };

  const AIConsentModal = (
    <Modal
      visible={status === 'needed' && resolveRef.current !== null}
      transparent
      animationType="slide"
      onRequestClose={handleDecline}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.iconRow}>
            <Text style={s.icon}>🤖</Text>
            <View style={s.badge}><Text style={s.badgeText}>AI Features</Text></View>
          </View>

          <Text style={s.title}>AI-Powered Safety Checks</Text>
          <Text style={s.subtitle}>
            Before enabling drug interaction checks and AI health insights, we need your consent.
          </Text>

          <View style={s.infoBox}>
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>✅</Text>
              <Text style={s.infoText}>Medicine names sent to Groq AI for safety analysis</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>🚫</Text>
              <Text style={s.infoText}>No personal identifiers ever shared (no name, DOB, or contacts)</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>🔄</Text>
              <Text style={s.infoText}>You can disable AI features at any time in Settings</Text>
            </View>
          </View>

          <View style={s.consentBox}>
            <Text style={s.consentText}>{CONSENT_TEXT.GROQ_AI_DATA_SHARING}</Text>
          </View>

          <TouchableOpacity
            style={s.checkRow}
            onPress={() => setChecked(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, checked && s.checkboxOn]}>
              {checked && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.checkLabel}>I have read and agree to the above</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.acceptBtn, !checked && s.acceptBtnOff]}
            onPress={handleAccept}
            disabled={!checked}
            activeOpacity={0.85}
          >
            <Text style={s.acceptBtnText}>Enable AI Features</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.declineBtn} onPress={handleDecline}>
            <Text style={s.declineBtnText}>No thanks, skip AI features</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return {
    aiConsentGranted: status === 'granted',
    aiConsentChecking: status === 'checking',
    requestConsent,
    AIConsentModal,
  };
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.borderLight,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  icon: { fontSize: 32 },
  badge: {
    backgroundColor: Colors.primaryLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 16 },
  infoBox: {
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, gap: 10, marginBottom: 14,
  },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoIcon: { fontSize: 14, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  consentBox: {
    backgroundColor: '#F0F8F5', borderRadius: 10,
    borderWidth: 1, borderColor: Colors.primary + '40',
    padding: 12, marginBottom: 16,
  },
  consentText: { fontSize: 11.5, color: Colors.textSecondary, lineHeight: 17 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 20,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { fontSize: 13, color: Colors.white, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  acceptBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  acceptBtnOff: { opacity: 0.4 },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  declineBtn: { alignItems: 'center', paddingVertical: 10 },
  declineBtnText: { fontSize: 14, color: Colors.textMuted },
});
