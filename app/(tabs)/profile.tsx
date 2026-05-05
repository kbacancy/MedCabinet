import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Switch, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  const [notifications, setNotificationsState] = useState(true);
  const [expiryAlerts, setExpiryAlertsState] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? '');
        const name = data.user.user_metadata?.full_name;
        if (name) setUserName(name);
      }
    });
    areNotificationsEnabled().then(setNotificationsState);
    areExpiryAlertsEnabled().then(setExpiryAlertsState);
  }, []);

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsState(value);
    await setNotificationsEnabled(value);
    if (!value) {
      await cancelAllNotifications();
    } else {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: meds } = await supabase
          .from('medicines')
          .select('*')
          .eq('user_id', data.user.id);
        if (meds) await rescheduleAllNotifications(meds as Medicine[]);
      }
    }
  };

  const handleExpiryAlertsToggle = async (value: boolean) => {
    setExpiryAlertsState(value);
    await setExpiryAlertsEnabled(value);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: meds } = await supabase
        .from('medicines')
        .select('*')
        .eq('user_id', data.user.id);
      if (meds) await rescheduleAllNotifications(meds as Medicine[]);
    }
  };

  const handleExportCSV = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data: meds, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('name');

    if (error || !meds?.length) {
      Alert.alert('Export', 'No medicines to export.');
      return;
    }

    const header = 'Name,Dosage,Quantity,Expiry Date,Category,Doctor,Pharmacy,Rx Number,Notes';
    const rows = (meds as Medicine[]).map(m =>
      [
        `"${m.name}"`,
        `"${m.dosage ?? ''}"`,
        m.quantity,
        `"${m.expiry_date ?? ''}"`,
        `"${m.category ?? ''}"`,
        `"${m.doctor_name ?? ''}"`,
        `"${m.pharmacy ?? ''}"`,
        `"${m.rx_number ?? ''}"`,
        `"${(m.notes ?? '').replace(/"/g, "'")}"`,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');

    await Share.share({
      message: csv,
      title: 'MedCabinet Export',
    });
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
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="🔔"
            label="Push Notifications"
            value={<Switch value={notifications} onValueChange={handleNotificationsToggle} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />}
          />
          <View style={styles.divider} />
          <SettingsRow
            emoji="⏰"
            label="Expiry Alerts"
            value={<Switch value={expiryAlerts} onValueChange={handleExpiryAlertsToggle} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />}
          />
        </View>

        <Text style={styles.sectionLabel}>Health</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="🆘"
            label="Medical ID"
            onPress={() => router.push('/medical-id' as any)}
          />
          <View style={styles.divider} />
          <SettingsRow
            emoji="👨‍⚕️"
            label="Doctors & Contacts"
            onPress={() => router.push('/contacts' as any)}
          />
          <View style={styles.divider} />
          <SettingsRow
            emoji="📤"
            label="Export Medicine List"
            onPress={handleExportCSV}
          />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <SettingsRow emoji="👨‍👩‍👧‍👦" label="Family Members" onPress={() => Alert.alert('Coming Soon', 'Family sharing coming soon!')} />
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
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarEmoji: { fontSize: 36 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  editButton: {
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 20,
  },
  editButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
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
