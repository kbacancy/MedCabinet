import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { Medicine, daysUntilExpiry } from '../../hooks/useMedicines';
import { useTodayDoseLogs } from '../../hooks/useDoseLogs';
import { checkInteractionsForOne } from '../../lib/interactions';
import { cancelMedicineNotifications } from '../../lib/notifications';

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function MedicineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isTaken, markTaken, unmarkTaken } = useTodayDoseLogs();

  const [med, setMed] = useState<Medicine | null>(null);
  const [otherMeds, setOtherMeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [refillAt, setRefillAt] = useState(5);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: medicine }, { data: all }] = await Promise.all([
        supabase.from('medicines').select('*').eq('id', id).single(),
        supabase.from('medicines').select('name').neq('id', id),
      ]);
      setLoading(false);
      if (medicine) { setMed(medicine); setRefillAt(medicine.refill_alert_at ?? 5); }
      if (all) setOtherMeds(all.map((m: { name: string }) => m.name));
    })();
  }, [id]);

  const handleRemove = () => {
    Alert.alert(
      'Remove Medicine',
      `Remove ${med?.name} from your cabinet?\n\nThis will also clear its medication history and adherence data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            setDeleting(true);
            const { error } = await supabase.from('medicines').delete().eq('id', id);
            setDeleting(false);
            if (error) Alert.alert('Error', error.message);
            else {
              await cancelMedicineNotifications(id as string);
              router.back();
            }
          },
        },
      ],
    );
  };

  const handleEditRefill = () => {
    Alert.prompt(
      'Refill Alert',
      'Alert when tablets remaining reach:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save', onPress: async (val?: string) => {
            const num = parseInt(val ?? '5');
            if (isNaN(num)) return;
            await supabase.from('medicines').update({ refill_alert_at: num }).eq('id', id);
            setRefillAt(num);
          },
        },
      ],
      'plain-text',
      String(refillAt),
      'number-pad',
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!med) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFound}>Medicine not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysLeft = daysUntilExpiry(med.expiry_date);
  const interactions = checkInteractionsForOne(med.name, otherMeds);
  const taken = isTaken(med.id);

  const formatExpiry = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('/');
    const d = parts.length === 3
      ? new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]))
      : new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const expiryStatus = () => {
    if (daysLeft < 0) return { text: 'EXPIRED', color: Colors.danger };
    if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, color: Colors.danger };
    return { text: `Expires in ${Math.round(daysLeft / 30)} months`, color: Colors.textSecondary };
  };

  const { text: expiryText, color: expiryColor } = expiryStatus();
  const hasPrescriptionInfo = med.doctor_name || med.pharmacy || med.rx_number || med.notes;
  const reminderTimes = med.reminder_times ?? ['09:00'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Medicine Details</Text>
        <TouchableOpacity onPress={() => router.push(`/medicine/edit?id=${id}` as any)} style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <Text style={styles.categoryLabel}>{med.category?.toUpperCase()}</Text>
            <Text style={styles.medName}>{med.name}</Text>
            {med.dosage ? (
              <View style={styles.tagsRow}>
                <View style={styles.tag}><Text style={styles.tagText}>{med.dosage}</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>{med.category}</Text></View>
              </View>
            ) : null}
          </View>
          <View style={styles.medIconBox}>
            <Text style={styles.medIcon}>💊</Text>
          </View>
        </View>

        {/* Today's dose — mark taken */}
        <TouchableOpacity
          style={[styles.takeCard, taken && styles.takeCardTaken]}
          onPress={() => taken ? unmarkTaken(med.id) : markTaken(med.id)}
          activeOpacity={0.8}
        >
          <View style={[styles.takeCircle, taken && styles.takeCircleTaken]}>
            <Text style={styles.takeCircleIcon}>{taken ? '✓' : '○'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.takeTodayTitle, taken && styles.takeTodayTitleTaken]}>
              {taken ? 'Taken today' : "Mark today's dose"}
            </Text>
            <Text style={styles.takeTodaySubtitle}>
              {reminderTimes.map(formatTime).join(' · ')}
            </Text>
          </View>
          <Text style={[styles.takeAction, taken && styles.takeActionTaken]}>
            {taken ? 'Undo' : 'Take'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <View style={styles.infoCol}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoSubLabel}>💊  Dosage</Text>
            </View>
            <Text style={styles.infoValue}>{med.dosage || '—'}</Text>
            <Text style={styles.infoMeta}>As prescribed</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoSubLabel}>📅  Expiry Date</Text>
            </View>
            <Text style={styles.infoValue}>{formatExpiry(med.expiry_date)}</Text>
            <Text style={[styles.infoMeta, { color: expiryColor }]}>{expiryText}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.remainingHeader}>
            <View>
              <Text style={styles.remainingTitle}>Remaining Quantity</Text>
              <Text style={styles.lastRefilled}>Category: {med.category}</Text>
            </View>
            <Text style={styles.quantityText}>
              <Text style={styles.quantityNum}>{med.quantity}</Text>
              <Text style={styles.quantityTotal}> tablets</Text>
            </Text>
          </View>
          <ProgressBar value={med.quantity} total={Math.max(med.quantity, 30)} />

          <View style={styles.refillAlertRow}>
            <Text style={styles.bellIcon}>🔔</Text>
            <Text style={styles.refillText}>Refill alert at {refillAt} tablets</Text>
            <TouchableOpacity onPress={handleEditRefill} style={styles.editRefill}>
              <Text style={styles.editRefillText}>EDIT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Prescription Info */}
        {hasPrescriptionInfo && (
          <>
            <Text style={styles.sectionTitle}>Prescription Info</Text>
            <View style={styles.prescriptionCard}>
              <InfoRow label="Doctor" value={med.doctor_name ?? ''} />
              <InfoRow label="Pharmacy" value={med.pharmacy ?? ''} />
              <InfoRow label="Rx Number" value={med.rx_number ?? ''} />
              {med.notes ? (
                <View style={[styles.infoRow, { flexDirection: 'column', gap: 4 }]}>
                  <Text style={styles.infoRowLabel}>Notes</Text>
                  <Text style={[styles.infoRowValue, { fontSize: 13, lineHeight: 18 }]}>{med.notes}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        {interactions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cabinet Interactions</Text>
            {interactions.map((item, i) => (
              <View key={`${item.name}-${i}`} style={[styles.interactionCard, item.safe ? styles.interactionSafe : styles.interactionAlert]}>
                <View style={[styles.interactionIconBox, item.safe ? styles.iconBoxSafe : styles.iconBoxAlert]}>
                  <Text style={styles.interactionIconEmoji}>{item.safe ? '✅' : '⚠️'}</Text>
                </View>
                <View style={styles.interactionBody}>
                  {!item.safe && <Text style={styles.alertLabel}>Interaction Alert</Text>}
                  {item.safe && <Text style={styles.safeLabel}>Safe with</Text>}
                  <Text style={[styles.interactionName, !item.safe && { color: Colors.danger }]}>{item.name}</Text>
                  <Text style={styles.interactionDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity style={styles.removeButton} onPress={handleRemove} disabled={deleting} activeOpacity={0.85}>
          {deleting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.removeIcon}>🗑</Text>
              <Text style={styles.removeText}>Remove from cabinet</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.removeWarning}>Removing this will also clear its medication history and adherence data.</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  notFound: { fontSize: 16, color: Colors.textSecondary },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: Colors.primary },
  navTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  heroSection: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  heroLeft: { flex: 1 },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5, marginBottom: 4 },
  medName: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: {
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.border,
  },
  tagText: { fontSize: 12, color: Colors.textSecondary },
  medIconBox: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  medIcon: { fontSize: 26 },
  takeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1.5, borderColor: Colors.primary,
  },
  takeCardTaken: { backgroundColor: Colors.surface, borderColor: Colors.border },
  takeCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.primary,
  },
  takeCircleTaken: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  takeCircleIcon: { fontSize: 16, color: Colors.primary },
  takeTodayTitle: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  takeTodayTitleTaken: { color: Colors.textSecondary },
  takeTodaySubtitle: { fontSize: 12, color: Colors.textSecondary },
  takeAction: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  takeActionTaken: { color: Colors.textMuted },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    flexDirection: 'row', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  infoCol: { flex: 1 },
  infoHeader: { marginBottom: 4 },
  infoSubLabel: { fontSize: 12, color: Colors.textSecondary },
  infoValue: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  infoMeta: { fontSize: 12, color: Colors.textSecondary },
  infoDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  sectionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  remainingHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  remainingTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  lastRefilled: { fontSize: 12, color: Colors.textSecondary },
  quantityText: {},
  quantityNum: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  quantityTotal: { fontSize: 14, color: Colors.textSecondary },
  progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, marginBottom: 14 },
  progressFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  refillAlertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 10,
  },
  bellIcon: { fontSize: 16 },
  refillText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  editRefill: {},
  editRefillText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  prescriptionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  infoRowLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  infoRowValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  interactionCard: {
    flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, gap: 12,
  },
  interactionSafe: { backgroundColor: Colors.white, borderColor: Colors.primary },
  interactionAlert: { backgroundColor: Colors.dangerLight, borderColor: '#F5C0BF' },
  interactionIconBox: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  iconBoxSafe: { backgroundColor: Colors.primaryLight },
  iconBoxAlert: { backgroundColor: Colors.dangerLight },
  interactionIconEmoji: { fontSize: 18 },
  interactionBody: { flex: 1 },
  safeLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  alertLabel: { fontSize: 11, color: Colors.danger, fontWeight: '600', marginBottom: 2 },
  interactionName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  interactionDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  removeButton: {
    backgroundColor: Colors.danger, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
  },
  removeIcon: { fontSize: 16 },
  removeText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  removeWarning: { textAlign: 'center', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  editBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  editBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
});
