import { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useSymptomLogs, RATING_FACES, RATING_LABELS, type SymptomLog } from '../../hooks/useSymptomLogs';
import { useMedicines } from '../../hooks/useMedicines';
import { useDoseLogRange } from '../../hooks/useDoseLogs';
import PlusIcon from '../../components/PlusIcon';

function ratingColor(r: number): string {
  if (r >= 4) return Colors.primary;
  if (r >= 3) return Colors.warning;
  return Colors.danger;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function avg(items: number[]): number | null {
  if (items.length === 0) return null;
  return items.reduce((s, v) => s + v, 0) / items.length;
}

export default function JournalScreen() {
  const router = useRouter();
  const { logs, loading, deleteLog } = useSymptomLogs();
  const { medicines } = useMedicines();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { logs: doseLogs } = useDoseLogRange(startDate, endDate);

  const medMap = useMemo(
    () => Object.fromEntries(medicines.map(m => [m.id, m.name])),
    [medicines],
  );

  const correlations = useMemo(() => {
    if (logs.length < 3) return [];
    return medicines.flatMap(med => {
      const takenDates = new Set(doseLogs.filter(d => d.medicine_id === med.id).map(d => d.date));
      if (takenDates.size === 0) return [];
      const whenTaken = logs.filter(s => takenDates.has(s.date)).map(s => s.rating);
      const whenSkipped = logs.filter(s => !takenDates.has(s.date)).map(s => s.rating);
      const takenAvg = avg(whenTaken);
      if (takenAvg === null) return [];
      return [{ medicineId: med.id, medicineName: med.name, takenAvg, skippedAvg: avg(whenSkipped) }];
    });
  }, [logs, doseLogs, medicines]);

  const handleLongPress = (log: SymptomLog) => {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLog(log.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Symptom Journal</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {correlations.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Medicine Correlation — last 30 days</Text>
              <View style={styles.corrCard}>
                {correlations.map((c, i) => (
                  <View key={c.medicineId}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.corrRow}>
                      <Text style={styles.corrMed} numberOfLines={1}>💊 {c.medicineName}</Text>
                      <View style={styles.corrStats}>
                        <View style={styles.corrStat}>
                          <Text style={styles.corrStatLabel}>When taken</Text>
                          <Text style={[styles.corrStatVal, { color: ratingColor(c.takenAvg) }]}>
                            {RATING_FACES[Math.round(c.takenAvg)]} {c.takenAvg.toFixed(1)}
                          </Text>
                        </View>
                        {c.skippedAvg !== null && (
                          <>
                            <View style={styles.corrSep} />
                            <View style={styles.corrStat}>
                              <Text style={styles.corrStatLabel}>When skipped</Text>
                              <Text style={[styles.corrStatVal, { color: ratingColor(c.skippedAvg) }]}>
                                {RATING_FACES[Math.round(c.skippedAvg)]} {c.skippedAvg.toFixed(1)}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {logs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📓</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyDesc}>
                Log how you feel each day to discover how your medicines affect your wellbeing.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/journal/add' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Add First Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Recent Entries</Text>
              <Text style={styles.hint}>Long-press an entry to delete</Text>
              <View style={styles.logList}>
                {logs.map((log, i) => (
                  <View key={log.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.logRow}
                      onLongPress={() => handleLongPress(log)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.ratingCircle, { backgroundColor: ratingColor(log.rating) + '22' }]}>
                        <Text style={styles.ratingFace}>{RATING_FACES[log.rating]}</Text>
                      </View>
                      <View style={styles.logBody}>
                        <View style={styles.logHeaderRow}>
                          <Text style={[styles.logRatingLabel, { color: ratingColor(log.rating) }]}>
                            {RATING_LABELS[log.rating]}
                          </Text>
                          <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                        </View>
                        {log.medicine_id && medMap[log.medicine_id] && (
                          <Text style={styles.logMed}>💊 {medMap[log.medicine_id]}</Text>
                        )}
                        {log.note ? (
                          <Text style={styles.logNote} numberOfLines={2}>{log.note}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/journal/add' as any)}
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
    backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 36 },
  backArrow: { fontSize: 22, color: Colors.textPrimary },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  hint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginBottom: 10 },
  corrCard: {
    backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden',
    marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  corrRow: { padding: 14 },
  corrMed: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  corrStats: { flexDirection: 'row', alignItems: 'center' },
  corrStat: { flex: 1, alignItems: 'center' },
  corrStatLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  corrStatVal: { fontSize: 16, fontWeight: '700' },
  corrSep: { width: 1, height: 36, backgroundColor: Colors.borderLight, marginHorizontal: 8 },
  divider: { height: 1, backgroundColor: Colors.borderLight },
  logList: {
    backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  ratingCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  ratingFace: { fontSize: 22 },
  logBody: { flex: 1 },
  logHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  logRatingLabel: { fontSize: 14, fontWeight: '600' },
  logDate: { fontSize: 12, color: Colors.textMuted },
  logMed: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  logNote: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  emptyBox: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
