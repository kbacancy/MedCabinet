import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useCaregiverLinks } from '../../hooks/useCaregiverLinks';

export default function AcceptInviteScreen() {
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const { acceptInvite, getInvitePreview } = useCaregiverLinks();

  const [token, setToken] = useState(tokenParam ?? '');
  const [preview, setPreview] = useState<{ memberName?: string; status?: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<{ memberId: string; memberName: string } | null>(null);
  const [error, setError] = useState('');

  // Auto-preview when a token arrives from deep link
  useEffect(() => {
    if (!tokenParam) return;
    handlePreview(tokenParam);
  }, [tokenParam]);

  const handlePreview = async (t = token) => {
    if (!t.trim()) { setError('Enter an invite code'); return; }
    setError('');
    setPreviewing(true);
    const res = await getInvitePreview(t.trim());
    setPreviewing(false);
    if (!res.valid) {
      setError('Invalid or expired invite code.');
      setPreview(null);
    } else if (res.status !== 'pending') {
      setError('This invite has already been used or was revoked.');
      setPreview(null);
    } else {
      setPreview(res);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    const res = await acceptInvite(token);
    setAccepting(false);
    if (!res.success) {
      setError(res.error ?? 'Could not accept invite. Please try again.');
    } else {
      setResult({ memberId: res.memberId!, memberName: preview?.memberName ?? 'member' });
    }
  };

  if (result) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.navbar}>
          <View style={{ width: 36 }} />
          <Text style={styles.navTitle}>Access Granted</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>You're now a caregiver!</Text>
          <Text style={styles.successDesc}>
            You now have access to{' '}
            <Text style={{ fontWeight: '700' }}>{result.memberName}</Text>'s medicines and dose logs.
          </Text>
          <TouchableOpacity
            style={styles.dashboardBtn}
            onPress={() => router.replace(`/caregiver/dashboard?memberId=${result.memberId}` as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.dashboardBtnText}>View Dashboard →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/caregiver/index' as any)}>
            <Text style={styles.backLink}>Back to Caregiver Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Accept Invite</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Enter invite code</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste your invite code here"
          placeholderTextColor={Colors.textMuted}
          value={token}
          onChangeText={t => { setToken(t); setPreview(null); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {preview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewEmoji}>👤</Text>
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>You've been invited to care for</Text>
              <Text style={styles.previewName}>{preview.memberName}</Text>
            </View>
          </View>
        )}

        {!preview ? (
          <TouchableOpacity
            style={[styles.primaryBtn, (!token.trim() || previewing) && styles.btnDisabled]}
            onPress={() => handlePreview()}
            disabled={!token.trim() || previewing}
            activeOpacity={0.85}
          >
            {previewing
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.primaryBtnText}>Check Code</Text>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, accepting && styles.btnDisabled]}
            onPress={handleAccept}
            disabled={accepting}
            activeOpacity={0.85}
          >
            {accepting
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.primaryBtnText}>Accept Access</Text>
            }
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          You need a MedCabinet account to accept a caregiver invite. The invite owner shared this code with you.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 36 },
  backArrow: { fontSize: 22, color: Colors.textPrimary },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 32 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 12,
    fontFamily: 'monospace',
  },
  errorText: { fontSize: 13, color: Colors.danger, marginBottom: 12, textAlign: 'center' },
  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: Colors.primary, marginBottom: 16,
  },
  previewEmoji: { fontSize: 32 },
  previewInfo: { flex: 1 },
  previewTitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  previewName: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  // Success
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  successEmoji: { fontSize: 64, marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  successDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  dashboardBtn: {
    marginTop: 8, backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  dashboardBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  backLink: { fontSize: 14, color: Colors.textMuted, textDecorationLine: 'underline' },
});
