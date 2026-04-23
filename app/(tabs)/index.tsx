import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useMedicines, daysUntilExpiry } from '../../hooks/useMedicines';
import { checkInteractions } from '../../lib/interactions';
import MedicineCard from '../../components/MedicineCard';
import PlusIcon from '../../components/PlusIcon';

function AdherenceRing({ percent }: { percent: number }) {
  const strokeDeg = (percent / 100) * 270;
  return (
    <View style={styles.ringOuter}>
      <Text style={styles.ringPercent}>{percent}%</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { medicines, loading, refetch } = useMedicines();
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name ?? data.user?.email ?? 'there';
      setUserName(name.split(' ')[0]);
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const expiringSoon = medicines.filter(m => daysUntilExpiry(m.expiry_date) <= 30).length;
  const interactions = checkInteractions(medicines.map(m => m.name));
  const interactionCount = interactions.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.greeting}>{greeting}{userName ? `, ${userName}` : ''}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
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

        <View style={styles.adherenceCard}>
          <View style={styles.adherenceLeft}>
            <Text style={styles.adherenceTitle}>Today's Adherence</Text>
            <Text style={styles.adherenceSubtitle}>{medicines.length > 0 ? `${medicines.length} medicines in cabinet` : 'Add medicines to track'}</Text>
          </View>
          <AdherenceRing percent={medicines.length > 0 ? 75 : 0} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Cabinet</Text>
          {medicines.length > 4 && (
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>Your cabinet is empty</Text>
            <Text style={styles.emptyDesc}>Tap the + button to add your first medicine.</Text>
          </View>
        ) : (
          medicines.map(med => (
            <MedicineCard
              key={med.id}
              medicine={{ ...med, daysLeft: daysUntilExpiry(med.expiry_date) }}
              onPress={() => router.push(`/medicine/${med.id}` as any)}
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
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 18 },
  greeting: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  viewAll: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
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
