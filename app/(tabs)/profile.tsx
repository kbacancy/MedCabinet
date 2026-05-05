import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
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
    const header = 'Name,Dosage,Quantity,Expiry Date,Category,Doctor,Pharmacy,Rx Number,Notes';
    const rows = (meds as Medicine[]).map(m =>
      [`"${m.name}"`, `"${m.dosage ?? ''}"`, m.quantity, `"${m.expiry_date ?? ''}"`,
        `"${m.category ?? ''}"`, `"${m.doctor_name ?? ''}"`, `"${m.pharmacy ?? ''}"`,
        `"${m.rx_number ?? ''}"`, `"${(m.notes ?? '').replace(/"/g, "'")}"`].join(',')
    );
    await Share.share({ message: [header, ...rows].join('\n'), title: 'MedCabinet Export' });
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
          <SettingsRow emoji="👨‍👩‍👧‍👦" label="Family Members" onPress={() => router.push('/family/index' as any)} />
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
            <Text style={styles.hipaaTitle}>HIPAA Compliant & Secure</Text>
            <Text style={styles.hipaaDesc}>Your health data is encrypted and protected.</Text>
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
});
