import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, TextInput, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useMedicines, daysUntilExpiry } from '../../hooks/useMedicines';
import { useTodayDoseLogs } from '../../hooks/useDoseLogs';
import { checkInteractions } from '../../lib/interactions';
import MedicineCard from '../../components/MedicineCard';
import PlusIcon from '../../components/PlusIcon';
import MotivationCard from '../../components/MotivationCard';

const ALL_CATEGORIES = ['All', 'Pain Relief', 'Antibiotics', 'Supplements', 'Vitamins', 'Blood Pressure', 'Diabetes', 'Cholesterol', 'Other'];

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

export default function HomeScreen() {
  const router = useRouter();
  const { medicines, loading, refetch } = useMedicines();
  const { isTaken, markTaken, refetch: refetchLogs } = useTodayDoseLogs();
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const meta = session?.user?.user_metadata;
      const name = meta?.full_name ?? session?.user?.email ?? 'there';
      setUserName(name.split(' ')[0]);
      setAvatarUrl(meta?.avatar_url ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchLogs()]);
    setRefreshing(false);
  };

  const expiringSoon = medicines.filter(m => daysUntilExpiry(m.expiry_date) <= 30).length;
  const interactions = checkInteractions(medicines.map(m => m.name));
  const interactionCount = interactions.length;

  // Real adherence: how many medicines taken today vs. total
  const takenCount = medicines.filter(m => isTaken(m.id)).length;
  const adherencePercent = medicines.length > 0 ? Math.round((takenCount / medicines.length) * 100) : 0;
  const allTaken = medicines.length > 0 && takenCount === medicines.length;

  // Active courses: antibiotics or doctor-prescribed medicines
  const activeCourses = medicines
    .filter(m => m.category === 'Antibiotics' || !!m.doctor_name)
    .map(m => m.name);

  // Filtered cabinet list
  const filtered = medicines.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              : <Text style={styles.avatarEmoji}>👤</Text>}
          </View>
          <Text style={styles.greeting}>{greeting}{userName ? `, ${userName}` : ''}</Text>
        </View>
      </View>

      {/* Search bar — fixed below header */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category chips — fixed below search */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {ALL_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, selectedCategory === cat && styles.catChipSelected]}
            onPress={() => setSelectedCategory(cat)}
            activeOpacity={0.8}
          >
            <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextSelected]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{medicines.length}</Text>
            <Text style={styles.statLabel}>Total{'\n'}Medicines</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, expiringSoon > 0 && { color: Colors.danger }]}>{expiringSoon}</Text>
            <Text style={styles.statLabel}>Expiring{'\n'}Soon</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, interactionCount > 0 && { color: Colors.warning }]}>{interactionCount}</Text>
            <Text style={styles.statLabel}>Interactions</Text>
          </View>
        </View>

        {/* Adherence card */}
        <View style={styles.adherenceCard}>
          <View style={styles.adherenceLeft}>
            <Text style={styles.adherenceTitle}>Today's Adherence</Text>
            <Text style={styles.adherenceSubtitle}>
              {medicines.length > 0
                ? `${takenCount} of ${medicines.length} taken today`
                : 'Add medicines to track'}
            </Text>
          </View>
          <AdherenceRing percent={adherencePercent} />
        </View>

        {/* Daily health motivation */}
        <MotivationCard
          medicineCount={medicines.length}
          takenCount={takenCount}
          adherencePercent={adherencePercent}
          activeCourses={activeCourses}
          allTaken={allTaken}
        />

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
                      <View style={[styles.doseStatus, taken && styles.doseStatusTaken]}>
                        <Text style={[styles.doseStatusIcon, taken && styles.doseStatusIconTaken]}>
                          {taken ? '✓' : '○'}
                        </Text>
                      </View>
                      <View style={styles.doseInfo}>
                        <Text style={styles.doseName}>{med.name}</Text>
                        <Text style={styles.doseTime}>{formatTime(firstTime)}{med.dosage ? ` · ${med.dosage}` : ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.takeBtn, taken && styles.takeBtnTaken]}
                        onPress={() => markTaken(med.id)}
                        disabled={taken}
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

        {/* Cabinet */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Cabinet</Text>
          {filtered.length !== medicines.length && (
            <TouchableOpacity onPress={() => { setSearch(''); setSelectedCategory('All'); }}>
              <Text style={styles.clearFilter}>Clear filter</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          medicines.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💊</Text>
              <Text style={styles.emptyTitle}>Your cabinet is empty</Text>
              <Text style={styles.emptyDesc}>Tap the + button to add your first medicine.</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptyDesc}>Try a different search or category.</Text>
            </View>
          )
        ) : (
          filtered.map(med => (
            <MedicineCard
              key={med.id}
              medicine={{ ...med, daysLeft: daysUntilExpiry(med.expiry_date) }}
              onPress={() => router.push(`/medicine/${med.id}` as any)}
              takenToday={isTaken(med.id)}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/medicine/add')} activeOpacity={0.85}>
        <PlusIcon size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  avatarEmoji: { fontSize: 18 },
  greeting: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  searchRow: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: 12,
    paddingHorizontal: 12, height: 42,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  categoryScroll: {
    backgroundColor: Colors.background,
    maxHeight: 52,
  },
  categoryContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  catChip: {
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  catChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  catChipTextSelected: { color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statNumber: { fontSize: 26, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', lineHeight: 16 },
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
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  clearFilter: { fontSize: 13, color: Colors.primary, fontWeight: '500', marginBottom: 12 },
  dosesCard: {
    backgroundColor: Colors.white, borderRadius: 16, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  dosesDivider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 60 },
  doseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
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
    position: 'absolute', bottom: 80, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
