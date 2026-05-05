import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useFamilyMedicines, useFamilyDoseLogs } from '../../hooks/useFamilyMedicines';
import { daysUntilExpiry } from '../../hooks/useMedicines';
import { getInitials, type FamilyMember } from '../../hooks/useFamilyMembers';
import MedicineCard from '../../components/MedicineCard';
import PlusIcon from '../../components/PlusIcon';

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function AdherenceRing({ percent }: { percent: number }) {
  return (
    <View style={styles.ringOuter}>
      <Text style={styles.ringPercent}>{percent}%</Text>
    </View>
  );
}

export default function FamilyMemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { medicines, loading: medsLoading, refetch: refetchMeds } = useFamilyMedicines(id!);
  const medicineIds = medicines.map(m => m.id);
  const { isTaken, markTaken, unmarkTaken, refetch: refetchLogs } = useFamilyDoseLogs(medicineIds);

  useEffect(() => {
    supabase
      .from('family_members')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setMember(data ?? null);
        setLoadingMember(false);
      });
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMeds(), refetchLogs()]);
    setRefreshing(false);
  };

  const takenCount = medicines.filter(m => isTaken(m.id)).length;
  const adherencePercent = medicines.length > 0 ? Math.round((takenCount / medicines.length) * 100) : 0;

  if (loadingMember || !member) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navName}>{member.name}</Text>
          <Text style={styles.navRelation}>{member.relationship}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push(`/family/add?id=${member.id}` as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Member hero card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroAvatar, { backgroundColor: member.color }]}>
            <Text style={styles.heroInitials}>{getInitials(member.name)}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{member.name}</Text>
            <View style={styles.heroRelationChip}>
              <Text style={styles.heroRelationText}>{member.relationship}</Text>
            </View>
            {member.notes ? <Text style={styles.heroNotes}>{member.notes}</Text> : null}
          </View>
        </View>

        {/* Adherence card */}
        <View style={styles.adherenceCard}>
          <View style={styles.adherenceLeft}>
            <Text style={styles.adherenceTitle}>Today's Adherence</Text>
            <Text style={styles.adherenceSubtitle}>
              {medicines.length > 0
                ? `${takenCount} of ${medicines.length} taken today`
                : 'No medicines yet'}
            </Text>
          </View>
          <AdherenceRing percent={adherencePercent} />
        </View>

        {/* Today's Doses */}
        {medicines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's Doses</Text>
            <View style={styles.dosesCard}>
              {medicines.map((med, i) => {
                const taken = isTaken(med.id);
                const firstTime = med.reminder_times?.[0] ?? '09:00';
                return (
                  <View key={med.id}>
                    {i > 0 && <View style={styles.dosesDivider} />}
                    <View style={styles.doseRow}>
                      <TouchableOpacity
                        style={[styles.doseStatus, taken && styles.doseStatusTaken]}
                        onPress={() => taken ? unmarkTaken(med.id) : markTaken(med.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.doseStatusIcon, taken && styles.doseStatusIconTaken]}>
                          {taken ? '✓' : '○'}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.doseInfo}>
                        <Text style={styles.doseName}>{med.name}</Text>
                        <Text style={styles.doseTime}>
                          {formatTime(firstTime)}{med.dosage ? ` · ${med.dosage}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.takeBtn, taken && styles.takeBtnTaken]}
                        onPress={() => taken ? unmarkTaken(med.id) : markTaken(med.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.takeBtnText, taken && styles.takeBtnTextTaken]}>
                          {taken ? 'Taken' : 'Take'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Medicine Cabinet */}
        <Text style={styles.sectionTitle}>
          {member.name.endsWith('s') ? `${member.name}' Cabinet` : `${member.name}'s Cabinet`}
        </Text>

        {medsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>No medicines yet</Text>
            <Text style={styles.emptyDesc}>
              Tap + to add a medicine for {member.name}.
            </Text>
          </View>
        ) : (
          medicines.map(med => (
            <MedicineCard
              key={med.id}
              medicine={{ ...med, daysLeft: daysUntilExpiry(med.expiry_date) }}
              onPress={() =>
                Alert.alert(med.name, `${med.dosage || 'No dosage'} · ${med.category}`, [
                  { text: 'OK' },
                ])
              }
              takenToday={isTaken(med.id)}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/medicine/add?memberId=${member.id}` as any)}
        activeOpacity={0.85}
      >
        <PlusIcon size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 44 },
  backArrow: { fontSize: 22, color: Colors.textPrimary },
  navCenter: { alignItems: 'center' },
  navName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  navRelation: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  editBtn: { width: 44, alignItems: 'flex-end' },
  editBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  heroInitials: { fontSize: 22, fontWeight: '700', color: Colors.white },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  heroRelationChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6,
  },
  heroRelationText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  heroNotes: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  adherenceCard: {
    backgroundColor: Colors.primary, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  adherenceLeft: { flex: 1 },
  adherenceTitle: { fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  adherenceSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  ringOuter: {
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 6, borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: Colors.white, borderRightColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  ringPercent: { fontSize: 15, fontWeight: '700', color: Colors.white },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  dosesCard: {
    backgroundColor: Colors.white, borderRadius: 16, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  dosesDivider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 60 },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  doseStatus: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  doseStatusTaken: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  doseStatusIcon: { fontSize: 14, color: Colors.textMuted },
  doseStatusIconTaken: { color: Colors.white },
  doseInfo: { flex: 1 },
  doseName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  doseTime: { fontSize: 12, color: Colors.textSecondary },
  takeBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.primary,
  },
  takeBtnTaken: { backgroundColor: Colors.surface, borderColor: Colors.border },
  takeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  takeBtnTextTaken: { color: Colors.textSecondary },
  loadingBox: { paddingVertical: 48, alignItems: 'center' },
  emptyBox: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
