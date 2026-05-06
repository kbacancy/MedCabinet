import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { daysUntilExpiry, type Medicine } from '../../hooks/useMedicines';
import { getInitials, type FamilyMember } from '../../hooks/useFamilyMembers';
import type { DoseLog } from '../../hooks/useDoseLogs';

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function CaregiverDashboardScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      setLoading(true);
      const [memberRes, medsRes, logsRes] = await Promise.all([
        supabase.from('family_members').select('*').eq('id', memberId).single(),
        supabase.from('medicines').select('*').eq('member_id', memberId).order('name'),
        supabase.from('dose_logs').select('*').eq('member_id', memberId).eq('date', today),
      ]);
      if (memberRes.data) setMember(memberRes.data);
      setMedicines(medsRes.data ?? []);
      setDoseLogs(logsRes.data ?? []);
      setLoading(false);
    })();
  }, [memberId]);

  const isTaken = (medicineId: string) => doseLogs.some(l => l.medicine_id === medicineId);
  const takenCount = medicines.filter(m => isTaken(m.id)).length;
  const adherencePct = medicines.length > 0 ? Math.round((takenCount / medicines.length) * 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{member?.name ?? '…'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : !member ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>Member not found or access denied.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Member hero */}
          <View style={styles.heroCard}>
            <View style={[styles.heroAvatar, { backgroundColor: member.color }]}>
              <Text style={styles.heroAvatarText}>{getInitials(member.name)}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{member.name}</Text>
              <Text style={styles.heroRel}>{member.relationship}</Text>
              <View style={styles.caregiverBadge}>
                <Text style={styles.caregiverBadgeText}>👁 Caregiver View</Text>
              </View>
            </View>
            <View style={styles.adherenceCircle}>
              <Text style={styles.adherencePct}>{adherencePct}%</Text>
              <Text style={styles.adherenceLabel}>today</Text>
            </View>
          </View>

          {/* Today's doses */}
          <Text style={styles.sectionLabel}>Today's Doses</Text>
          {medicines.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No medicines on file for {member.name}.</Text>
            </View>
          ) : (
            <View style={styles.dosesCard}>
              {medicines.map((med, i) => {
                const taken = isTaken(med.id);
                const firstTime = med.reminder_times?.[0] ?? '09:00';
                const daysLeft = daysUntilExpiry(med.expiry_date);
                return (
                  <View key={med.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.doseRow}>
                      <View style={[styles.doseStatus, taken && styles.doseStatusTaken]}>
                        <Text style={[styles.doseIcon, taken && styles.doseIconTaken]}>
                          {taken ? '✓' : '○'}
                        </Text>
                      </View>
                      <View style={styles.doseInfo}>
                        <Text style={styles.doseName}>{med.name}</Text>
                        <Text style={styles.doseTime}>
                          {formatTime(firstTime)}{med.dosage ? ` · ${med.dosage}` : ''}
                        </Text>
                      </View>
                      <View style={styles.doseRight}>
                        <View style={[styles.doseTag, taken ? styles.doseTagTaken : styles.doseTagPending]}>
                          <Text style={[styles.doseTagText, taken ? styles.doseTagTextTaken : styles.doseTagTextPending]}>
                            {taken ? 'Taken' : 'Pending'}
                          </Text>
                        </View>
                        {daysLeft <= 30 && (
                          <Text style={[styles.expiryWarn, daysLeft <= 7 && { color: Colors.danger }]}>
                            ⚠ {daysLeft}d
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Quick stats */}
          <Text style={styles.sectionLabel}>Cabinet</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{medicines.length}</Text>
              <Text style={styles.statLabel}>Medicines</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, takenCount === medicines.length && medicines.length > 0 && { color: Colors.primary }]}>
                {takenCount}/{medicines.length}
              </Text>
              <Text style={styles.statLabel}>Taken Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: medicines.filter(m => daysUntilExpiry(m.expiry_date) <= 30).length > 0 ? Colors.warning : Colors.primary }]}>
                {medicines.filter(m => daysUntilExpiry(m.expiry_date) <= 30).length}
              </Text>
              <Text style={styles.statLabel}>Expiring</Text>
            </View>
          </View>

          <Text style={styles.readOnlyNote}>
            🔒 Read-only view. You cannot modify medicines or mark doses on behalf of {member.name}.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
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
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  heroAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  heroAvatarText: { fontSize: 20, fontWeight: '700', color: Colors.white },
  heroInfo: { flex: 1, gap: 3 },
  heroName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  heroRel: { fontSize: 13, color: Colors.textSecondary },
  caregiverBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2,
  },
  caregiverBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  adherenceCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3, borderColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  adherencePct: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  adherenceLabel: { fontSize: 9, color: Colors.textMuted },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  dosesCard: {
    backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden',
    marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 60 },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  doseStatus: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  doseStatusTaken: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  doseIcon: { fontSize: 14, color: Colors.textMuted },
  doseIconTaken: { color: Colors.white },
  doseInfo: { flex: 1 },
  doseName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  doseTime: { fontSize: 12, color: Colors.textSecondary },
  doseRight: { alignItems: 'flex-end', gap: 3 },
  doseTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  doseTagTaken: { backgroundColor: Colors.primaryLight },
  doseTagPending: { backgroundColor: Colors.inputBg },
  doseTagText: { fontSize: 11, fontWeight: '600' },
  doseTagTextTaken: { color: Colors.primary },
  doseTagTextPending: { color: Colors.textMuted },
  expiryWarn: { fontSize: 10, color: Colors.warning, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  statLabel: { fontSize: 11, color: Colors.textSecondary },
  readOnlyNote: {
    fontSize: 12, color: Colors.textMuted, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 8,
  },
});
