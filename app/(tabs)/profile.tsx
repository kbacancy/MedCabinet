import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  StatusBar, Alert, Switch, Share, Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import {
  areNotificationsEnabled, areExpiryAlertsEnabled,
  setNotificationsEnabled, setExpiryAlertsEnabled,
  cancelAllNotifications, rescheduleAllNotifications,
} from '../../lib/notifications';
import type { Medicine } from '../../hooks/useMedicines';
import { recordConsent, CONSENT_TEXT } from '../../lib/consent';
import { logAuditEvent } from '../../lib/audit';

type RowProps = { emoji: string; label: string; onPress?: () => void; value?: React.ReactNode };

function SettingsRow({ emoji, label, onPress, value }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowEmoji}>{emoji}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {value !== undefined ? value : <Text style={styles.rowArrow}>›</Text>}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notifications, setNotificationsState] = useState(true);
  const [expiryAlerts, setExpiryAlertsState] = useState(true);
  const [showCsvConsent, setShowCsvConsent] = useState(false);
  const [csvConsentChecked, setCsvConsentChecked] = useState(false);
  const [pendingMeds, setPendingMeds] = useState<Medicine[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email ?? '');
        const meta = session.user.user_metadata;
        if (meta?.full_name) setUserName(meta.full_name);
        setAvatarUrl(meta?.avatar_url ?? null);
      }
    });
    areNotificationsEnabled().then(setNotificationsState);
    areExpiryAlertsEnabled().then(setExpiryAlertsState);
    return () => subscription.unsubscribe();
  }, []);

  /* ── Avatar upload ─────────────────────────────────────── */

  const handleAvatarPress = () => {
    const options: any[] = [
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Choose from Library', onPress: () => pickImage('library') },
    ];
    if (avatarUrl) {
      options.push({ text: 'Remove Photo', style: 'destructive', onPress: removeAvatar });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', 'Choose an option', options);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
    }

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = uri.split('.').pop()?.toLowerCase().replace('jpg', 'jpeg') ?? 'jpeg';
      const path = `${user.id}/avatar.${ext}`;
      const mimeType = `image/${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: mimeType, upsert: true });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;

      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
    } catch {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    await supabase.auth.updateUser({ data: { avatar_url: null } });
    setAvatarUrl(null);
    setUploading(false);
  };

  /* ── Notification toggles ──────────────────────────────── */

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsState(value);
    await setNotificationsEnabled(value);
    if (!value) {
      await cancelAllNotifications();
    } else {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: meds } = await supabase.from('medicines').select('*').eq('user_id', data.user.id);
        if (meds) await rescheduleAllNotifications(meds as Medicine[]);
      }
    }
  };

  const handleExpiryAlertsToggle = async (value: boolean) => {
    setExpiryAlertsState(value);
    await setExpiryAlertsEnabled(value);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: meds } = await supabase.from('medicines').select('*').eq('user_id', data.user.id);
      if (meds) await rescheduleAllNotifications(meds as Medicine[]);
    }
  };

  /* ── Export CSV ────────────────────────────────────────── */

  const handleExportCSV = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data: meds, error } = await supabase
      .from('medicines').select('*').eq('user_id', authData.user.id).order('name');
    if (error || !meds?.length) { Alert.alert('Export', 'No medicines to export.'); return; }
    setPendingMeds(meds as Medicine[]);
    setCsvConsentChecked(false);
    setShowCsvConsent(true);
  };

  const handleCsvConsentAccept = async () => {
    setShowCsvConsent(false);
    const { success, error: consentError } = await recordConsent('CSV_EXPORT', {
      medicines_count: pendingMeds.length,
    });
    if (!success) {
      Alert.alert('Unable to proceed', `Could not record your consent: ${consentError}. Please try again.`);
      return;
    }
    await logAuditEvent('READ', 'medicines', undefined, {
      action_detail: 'csv_export', medicines_count: pendingMeds.length,
    });
    const header = 'Name,Dosage,Quantity,Expiry Date,Category,Doctor,Pharmacy,Rx Number,Notes';
    const rows = pendingMeds.map(m =>
      [`"${m.name}"`, `"${m.dosage ?? ''}"`, m.quantity, `"${m.expiry_date ?? ''}"`,
        `"${m.category ?? ''}"`, `"${m.doctor_name ?? ''}"`, `"${m.pharmacy ?? ''}"`,
        `"${m.rx_number ?? ''}"`, `"${(m.notes ?? '').replace(/"/g, "'")}"`].join(',')
    );
    await Share.share({ message: [header, ...rows].join('\n'), title: 'MedCabinet Export' });
    setPendingMeds([]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const displayName = userName || userEmail.split('@')[0] || 'User';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* CSV Export Consent Modal */}
      <Modal visible={showCsvConsent} transparent animationType="slide" onRequestClose={() => setShowCsvConsent(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Before You Export</Text>
            <Text style={styles.modalSubtitle}>
              This CSV includes your full medicine list with dosages, doctor names, pharmacy, and prescription numbers.
            </Text>
            <View style={styles.modalWarning}>
              <Text style={styles.modalWarningIcon}>⚠️</Text>
              <Text style={styles.modalWarningText}>
                Once shared, MedCabinet cannot control how this file is stored or accessed by third parties.
              </Text>
            </View>
            <View style={styles.modalConsentBox}>
              <Text style={styles.modalConsentText}>{CONSENT_TEXT.CSV_EXPORT}</Text>
            </View>
            <TouchableOpacity style={styles.modalCheckRow} onPress={() => setCsvConsentChecked(v => !v)} activeOpacity={0.7}>
              <View style={[styles.modalCheckbox, csvConsentChecked && styles.modalCheckboxOn]}>
                {csvConsentChecked && <Text style={styles.modalCheckmark}>✓</Text>}
              </View>
              <Text style={styles.modalCheckLabel}>I understand and consent to exporting this data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalAcceptBtn, !csvConsentChecked && styles.modalAcceptBtnOff]}
              onPress={handleCsvConsentAccept}
              disabled={!csvConsentChecked}
              activeOpacity={0.85}
            >
              <Text style={styles.modalAcceptBtnText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCsvConsent(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {/* Tappable avatar with camera badge */}
          <TouchableOpacity
            style={styles.avatarLarge}
            onPress={handleAvatarPress}
            activeOpacity={0.85}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={Colors.primary} size="large" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>👤</Text>
            )}
            {!uploading && (
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraBadgeIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleAvatarPress} activeOpacity={0.8}>
            <Text style={styles.editButtonText}>
              {avatarUrl ? 'Change Photo' : 'Add Profile Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="🔔" label="Push Notifications"
            value={<Switch value={notifications} onValueChange={handleNotificationsToggle} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />}
          />
          <View style={styles.divider} />
          <SettingsRow
            emoji="⏰" label="Expiry Alerts"
            value={<Switch value={expiryAlerts} onValueChange={handleExpiryAlertsToggle} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />}
          />
        </View>

        <Text style={styles.sectionLabel}>Health</Text>
        <View style={styles.card}>
          <SettingsRow emoji="🆘" label="Medical ID" onPress={() => router.push('/medical-id' as any)} />
          <View style={styles.divider} />
          <SettingsRow emoji="👨‍⚕️" label="Doctors & Contacts" onPress={() => router.push('/contacts' as any)} />
          <View style={styles.divider} />
          <SettingsRow emoji="📤" label="Export Medicine List" onPress={handleExportCSV} />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <SettingsRow emoji="👨‍👩‍👧‍👦" label="Family Members" onPress={() => router.push('/family' as any)} />
          <View style={styles.divider} />
          <SettingsRow emoji="👥" label="Caregiver Mode" onPress={() => router.push('/caregiver' as any)} />
          <View style={styles.divider} />
          <SettingsRow emoji="🔒" label="Privacy Settings" onPress={() => Alert.alert('Coming Soon')} />
        </View>

        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          <SettingsRow emoji="❓" label="Help & FAQ" onPress={() => Alert.alert('Help', 'Contact support@medcabinet.com')} />
          <View style={styles.divider} />
          <SettingsRow emoji="📄" label="Terms & Privacy" onPress={() => Alert.alert('Coming Soon')} />
          <View style={styles.divider} />
          <SettingsRow emoji="⭐" label="Rate MedCabinet" onPress={() => Alert.alert('Coming Soon')} />
        </View>

        <View style={styles.hipaaCard}>
          <Text style={styles.hipaaIcon}>🛡</Text>
          <View>
            <Text style={styles.hipaaTitle}>Privacy Protected</Text>
            <Text style={styles.hipaaDesc}>Your data is secured with row-level access controls and session protection.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>MedCabinet v1.0.0</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  profileCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatarLarge: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarEmoji: { fontSize: 38 },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  cameraBadgeIcon: { fontSize: 13 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  editButton: {
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 20,
  },
  editButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowEmoji: { fontSize: 20 },
  rowLabel: { fontSize: 15, color: Colors.textPrimary },
  rowArrow: { fontSize: 20, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 52 },
  hipaaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 14, marginBottom: 16,
  },
  hipaaIcon: { fontSize: 22 },
  hipaaTitle: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  hipaaDesc: { fontSize: 12, color: Colors.textSecondary },
  signOutButton: {
    backgroundColor: Colors.dangerLight, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#F5C0BF',
  },
  signOutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
  versionText: { textAlign: 'center', fontSize: 12, color: Colors.textMuted },

  // CSV consent modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.borderLight,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 14 },
  modalWarning: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFF8EC',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#F5DFA0', marginBottom: 12,
  },
  modalWarningIcon: { fontSize: 15 },
  modalWarningText: { flex: 1, fontSize: 12, color: '#8a6000', lineHeight: 17 },
  modalConsentBox: {
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderLight, padding: 12, marginBottom: 16,
  },
  modalConsentText: { fontSize: 11.5, color: Colors.textSecondary, lineHeight: 17 },
  modalCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalCheckbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modalCheckboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modalCheckmark: { fontSize: 13, color: Colors.white, fontWeight: '700' },
  modalCheckLabel: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  modalAcceptBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  modalAcceptBtnOff: { opacity: 0.4 },
  modalAcceptBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: Colors.textMuted },
});
