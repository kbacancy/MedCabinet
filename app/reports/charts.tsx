import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useMedicines } from '../../hooks/useMedicines';
import { useDoseLogRange } from '../../hooks/useDoseLogs';
import { getAdherenceSummaries, getWeeklyPoints } from '../../hooks/useAdherenceStats';

type Range = '1W' | '1M' | '3M';

const RANGES: { label: string; key: Range; days: number }[] = [
  { label: '1 Week', key: '1W', days: 7 },
  { label: '1 Month', key: '1M', days: 30 },
  { label: '3 Months', key: '3M', days: 90 },
];

function dateOffset(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// Horizontal bar showing adherence % for one medicine
function AdherenceBar({ percent, color }: { percent: number; color: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${percent}%` as any, backgroundColor: color }]} />
    </View>
  );
}

// Mini sparkline: a row of weekly dots connected by blocks
function Sparkline({ points, color }: { points: { percent: number }[]; color: string }) {
  if (points.length === 0) return null;
  const h = 28;
  const dotW = 6;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: h, gap: 3 }}>
      {points.map((p, i) => {
        const barH = Math.max(3, Math.round((p.percent / 100) * h));
        return (
          <View
            key={i}
            style={{
              width: dotW, height: barH,
              backgroundColor: p.percent >= 80 ? color : p.percent >= 50 ? Colors.warning : Colors.danger,
              borderRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
}

export default function ChartsScreen() {
  const router = useRouter();
  const { medicines, loading: medLoading } = useMedicines();
  const [range, setRange] = useState<Range>('1M');
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  const days = RANGES.find(r => r.key === range)!.days;
  const startDate = useMemo(() => dateOffset(days), [days]);
  const endDate = useMemo(() => today(), []);

  const { logs, loading: logsLoading } = useDoseLogRange(startDate, endDate);

  const summaries = useMemo(
    () => getAdherenceSummaries(logs, medicines, startDate, endDate),
    [logs, medicines, startDate, endDate],
  );

  const loading = medLoading || logsLoading;

  const overallPercent = useMemo(() => {
    if (summaries.length === 0) return 0;
    return Math.round(summaries.reduce((s, x) => s + x.percent, 0) / summaries.length);
  }, [summaries]);

  const displayedMeds = selectedMedId
    ? summaries.filter(s => s.medicineId === selectedMedId)
    : summaries;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Adherence Charts</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Range selector */}
        <View style={styles.segmentRow}>
          {RANGES.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.segment, range === r.key && styles.segmentActive]}
              onPress={() => setRange(r.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, range === r.key && styles.segmentTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overall stat */}
        <View style={styles.overallCard}>
          <View style={styles.overallLeft}>
            <Text style={styles.overallLabel}>Overall Adherence</Text>
            <Text style={styles.overallSub}>
              {RANGES.find(r => r.key === range)!.label} · {medicines.length} medicine{medicines.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.overallRight}>
            <Text style={[
              styles.overallPercent,
              overallPercent >= 80 ? { color: Colors.primary } :
              overallPercent >= 50 ? { color: Colors.warning } :
              { color: Colors.danger },
            ]}>
              {loading ? '—' : `${overallPercent}%`}
            </Text>
          </View>
        </View>

        {/* Medicine filter chips */}
        {medicines.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipContent}
          >
            <TouchableOpacity
              style={[styles.chip, selectedMedId === null && styles.chipActive]}
              onPress={() => setSelectedMedId(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, selectedMedId === null && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {summaries.map(s => (
              <TouchableOpacity
                key={s.medicineId}
                style={[styles.chip, selectedMedId === s.medicineId && { backgroundColor: s.color, borderColor: s.color }]}
                onPress={() => setSelectedMedId(prev => prev === s.medicineId ? null : s.medicineId)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selectedMedId === s.medicineId && styles.chipTextActive]}>
                  {s.medicineName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Per-medicine bars */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>No medicines yet</Text>
            <Text style={styles.emptyDesc}>Add medicines to start tracking adherence.</Text>
          </View>
        ) : logs.length < 3 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📈</Text>
            <Text style={styles.emptyTitle}>Not enough data yet</Text>
            <Text style={styles.emptyDesc}>
              Keep logging doses — charts appear after a few days of tracking.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>By Medicine</Text>
            <View style={styles.barsCard}>
              {displayedMeds.map((s, i) => {
                const weeklyPoints = getWeeklyPoints(logs, s.medicineId, startDate, endDate);
                return (
                  <View key={s.medicineId}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.barRow}>
                      <View style={styles.barHeader}>
                        <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                        <Text style={styles.barMedName} numberOfLines={1}>{s.medicineName}</Text>
                        <Text style={[
                          styles.barPercent,
                          s.percent >= 80 ? { color: Colors.primary } :
                          s.percent >= 50 ? { color: Colors.warning } :
                          { color: Colors.danger },
                        ]}>
                          {s.percent}%
                        </Text>
                      </View>
                      <AdherenceBar percent={s.percent} color={s.color} />
                      <View style={styles.barMeta}>
                        <Text style={styles.barMetaText}>
                          {s.takenDays} of {s.totalDays} days taken
                        </Text>
                        {s.streak > 0 && (
                          <Text style={styles.streakText}>🔥 {s.streak}-day streak</Text>
                        )}
                      </View>
                      {weeklyPoints.length > 1 && (
                        <View style={styles.sparklineWrap}>
                          <Text style={styles.sparklineLabel}>Weekly trend</Text>
                          <Sparkline points={weeklyPoints} color={s.color} />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Summary table */}
            <Text style={styles.sectionLabel}>Summary</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Medicine</Text>
                <Text style={styles.tableCell}>Adherence</Text>
                <Text style={styles.tableCell}>Streak</Text>
              </View>
              {summaries.map((s, i) => (
                <View key={s.medicineId}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCellView, { flex: 2 }]}>
                      <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                      <Text style={styles.tableText} numberOfLines={1}>{s.medicineName}</Text>
                    </View>
                    <Text style={[
                      styles.tableText, styles.tableCell,
                      s.percent >= 80 ? { color: Colors.primary, fontWeight: '700' } :
                      s.percent >= 50 ? { color: Colors.warning, fontWeight: '700' } :
                      { color: Colors.danger, fontWeight: '700' },
                    ]}>
                      {s.percent}%
                    </Text>
                    <Text style={[styles.tableText, styles.tableCell]}>
                      {s.streak > 0 ? `🔥${s.streak}d` : '—'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  segmentRow: {
    flexDirection: 'row', backgroundColor: Colors.inputBg, borderRadius: 10,
    padding: 3, marginBottom: 16,
  },
  segment: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  overallCard: {
    backgroundColor: Colors.primary, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  overallLeft: { flex: 1 },
  overallLabel: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 3 },
  overallSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  overallRight: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
  },
  overallPercent: { fontSize: 16, fontWeight: '800', color: Colors.white },
  chipScroll: { marginBottom: 16 },
  chipContent: { gap: 8, paddingRight: 4 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  emptyBox: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  barsCard: {
    backgroundColor: Colors.white, borderRadius: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  barRow: { paddingVertical: 14, paddingHorizontal: 16 },
  barHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  barMedName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  barPercent: { fontSize: 15, fontWeight: '800' },
  barTrack: {
    height: 10, borderRadius: 5, backgroundColor: Colors.inputBg, overflow: 'hidden', marginBottom: 6,
  },
  barFill: { height: 10, borderRadius: 5 },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barMetaText: { fontSize: 11, color: Colors.textMuted },
  streakText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  sparklineWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  sparklineLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: Colors.borderLight },
  tableCard: {
    backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 16,
    backgroundColor: Colors.inputBg,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  tableCell: { flex: 1, fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableCellView: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableText: { fontSize: 13, color: Colors.textPrimary },
});
