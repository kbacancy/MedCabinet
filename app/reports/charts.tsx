import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { useMedicines } from '../../hooks/useMedicines';
import { useDoseLogRange } from '../../hooks/useDoseLogs';
import { getAdherenceSummaries, getWeeklyPoints } from '../../hooks/useAdherenceStats';

type Range = '1W' | '1M' | '3M';

const RANGES: { label: string; key: Range; days: number }[] = [
  { label: '1 Week',   key: '1W', days: 7  },
  { label: '1 Month',  key: '1M', days: 30 },
  { label: '3 Months', key: '3M', days: 90 },
];

function dateOffset(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}
function today() {
  return new Date().toISOString().split('T')[0];
}
function adherenceColor(p: number) {
  return p >= 80 ? Colors.primary : p >= 50 ? Colors.warning : Colors.danger;
}
function adherenceLabel(p: number) {
  return p >= 80 ? 'Excellent' : p >= 50 ? 'Fair' : 'Needs Attention';
}

// ─── Donut Ring ───────────────────────────────────────────────────────────────
function DonutRing({
  percent, size = 80, strokeWidth = 8,
  trackColor = 'rgba(255,255,255,0.2)', fillColor = '#fff',
}: {
  percent: number; size?: number; strokeWidth?: number;
  trackColor?: string; fillColor?: string;
}) {
  const r    = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const arc  = (Math.min(Math.max(percent, 0), 100) / 100) * circ;
  const cx   = size / 2;
  const cy   = size / 2;
  return (
    <View style={{ transform: [{ rotate: '-90deg' }] }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={fillColor} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// ─── Smooth Sparkline ─────────────────────────────────────────────────────────
function SparkLine({
  points, color, uid, width, height = 48,
}: {
  points: { percent: number }[]; color: string; uid: string; width: number; height?: number;
}) {
  if (points.length < 2) return null;

  const maxVal = Math.max(...points.map(p => p.percent), 1);
  const mapped = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - (p.percent / maxVal) * height * 0.78 - height * 0.1,
  }));

  let line = `M ${mapped[0].x.toFixed(1)} ${mapped[0].y.toFixed(1)}`;
  for (let i = 1; i < mapped.length; i++) {
    const pr  = mapped[i - 1];
    const cu  = mapped[i];
    const cpX = ((pr.x + cu.x) / 2).toFixed(1);
    line += ` C ${cpX} ${pr.y.toFixed(1)}, ${cpX} ${cu.y.toFixed(1)}, ${cu.x.toFixed(1)} ${cu.y.toFixed(1)}`;
  }
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const gid  = `g_${uid.replace(/-/g, '_')}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.28" />
          <Stop offset="1" stopColor={color} stopOpacity="0.0"  />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gid})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {mapped.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
      ))}
    </Svg>
  );
}

// ─── Per-medicine Card ────────────────────────────────────────────────────────
type Summary = ReturnType<typeof getAdherenceSummaries>[0];

function MedicineCard({
  s, logs, startDate, endDate, chartWidth,
}: {
  s: Summary; logs: any[]; startDate: string; endDate: string; chartWidth: number;
}) {
  const pts    = useMemo(() => getWeeklyPoints(logs, s.medicineId, startDate, endDate), [logs, s.medicineId]);
  const aColor = adherenceColor(s.percent);

  return (
    <View style={mc.card}>
      <View style={[mc.accent, { backgroundColor: s.color }]} />
      <View style={mc.body}>

        {/* Header: name + mini donut */}
        <View style={mc.headerRow}>
          <View style={mc.nameRow}>
            <View style={[mc.dot, { backgroundColor: s.color }]} />
            <Text style={mc.name} numberOfLines={1}>{s.medicineName}</Text>
          </View>
          <View style={mc.ringWrap}>
            <DonutRing
              percent={s.percent} size={52} strokeWidth={6}
              trackColor={Colors.inputBg} fillColor={aColor}
            />
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={[mc.ringPct, { color: aColor }]}>{s.percent}%</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={mc.track}>
          <View style={[mc.fill, { width: `${s.percent}%` as any, backgroundColor: aColor }]} />
        </View>

        {/* Meta */}
        <View style={mc.metaRow}>
          <Text style={mc.metaTxt}>{s.takenDays} of {s.totalDays} days taken</Text>
          {s.streak > 0 && (
            <View style={mc.streakBadge}>
              <Text style={mc.streakTxt}>🔥 {s.streak}-day streak</Text>
            </View>
          )}
        </View>

        {/* Sparkline */}
        {pts.length > 1 && (
          <View style={mc.sparkWrap}>
            <Text style={mc.sparkLbl}>Weekly Trend</Text>
            <SparkLine points={pts} color={s.color} uid={s.medicineId} width={chartWidth} />
          </View>
        )}
      </View>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 4, overflow: 'hidden',
  },
  accent:    { width: 4 },
  body:      { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  name:      { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  ringWrap:  { width: 52, height: 52 },
  ringPct:   { fontSize: 11, fontWeight: '800' },
  track:     { height: 9, borderRadius: 5, backgroundColor: Colors.inputBg, overflow: 'hidden', marginBottom: 10 },
  fill:      { height: 9, borderRadius: 5 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaTxt:   { fontSize: 11, color: Colors.textMuted },
  streakBadge: { backgroundColor: Colors.warningLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  streakTxt:   { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  sparkWrap: { marginTop: 14 },
  sparkLbl:  { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChartsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { medicines, loading: medLoading } = useMedicines();
  const [range, setRange]           = useState<Range>('1M');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const days      = RANGES.find(r => r.key === range)!.days;
  const startDate = useMemo(() => dateOffset(days), [days]);
  const endDate   = useMemo(() => today(), []);

  const { logs, loading: logsLoading } = useDoseLogRange(startDate, endDate);
  const summaries = useMemo(
    () => getAdherenceSummaries(logs, medicines, startDate, endDate),
    [logs, medicines, startDate, endDate],
  );

  const loading       = medLoading || logsLoading;
  const overallPct    = summaries.length ? Math.round(summaries.reduce((a, x) => a + x.percent, 0) / summaries.length) : 0;
  const onTrack       = summaries.filter(s => s.percent >= 80).length;
  const longestStreak = summaries.reduce((m, s) => s.streak > m ? s.streak : m, 0);
  const bestMed       = summaries.reduce<Summary | null>((b, s) => (!b || s.percent > b.percent) ? s : b, null);
  const displayedMeds = selectedId ? summaries.filter(s => s.medicineId === selectedId) : summaries;
  const rangeMeta     = RANGES.find(r => r.key === range)!;

  // card inner width: screen - 2×16 outer padding - 4 accent - 2×14 inner padding
  const chartWidth = width - 32 - 4 - 28;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Navbar – green, no border */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Adherence Charts</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Range selector */}
        <View style={s.segRow}>
          {RANGES.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[s.seg, range === r.key && s.segActive]}
              onPress={() => setRange(r.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.segTxt, range === r.key && s.segTxtActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero: overall adherence + stats */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroLabel}>Overall Adherence</Text>
              <Text style={s.heroSub}>
                {rangeMeta.label} · {medicines.length} medicine{medicines.length !== 1 ? 's' : ''}
              </Text>
              {!loading && (
                <View style={s.statusRow}>
                  <View style={[s.statusDot, {
                    backgroundColor: overallPct >= 80 ? '#A8EDCA' : overallPct >= 50 ? '#FFD580' : '#FF9999',
                  }]} />
                  <Text style={s.statusTxt}>{adherenceLabel(overallPct)}</Text>
                </View>
              )}
            </View>
            <View style={s.heroRingWrap}>
              <DonutRing
                percent={loading ? 0 : overallPct} size={90} strokeWidth={9}
                trackColor="rgba(255,255,255,0.2)" fillColor="#fff"
              />
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={s.heroPct}>{loading ? '—' : `${overallPct}%`}</Text>
              </View>
            </View>
          </View>

          {/* Stats strip */}
          <View style={s.statsStrip}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{onTrack}/{summaries.length}</Text>
              <Text style={s.statLbl}>On Track</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.statItem}>
              <Text style={s.statVal} numberOfLines={1}>
                {bestMed ? bestMed.medicineName.split(' ')[0] : '—'}
              </Text>
              <Text style={s.statLbl}>Best Medicine</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{longestStreak > 0 ? `${longestStreak}d` : '—'}</Text>
              <Text style={s.statLbl}>Top Streak</Text>
            </View>
          </View>
        </View>

        {/* Filter chips */}
        {medicines.length > 1 && !loading && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.chipScroll} contentContainerStyle={s.chipContent}>
            <TouchableOpacity
              style={[s.chip, selectedId === null && s.chipActive]}
              onPress={() => setSelectedId(null)} activeOpacity={0.8}
            >
              <Text style={[s.chipTxt, selectedId === null && s.chipTxtActive]}>All</Text>
            </TouchableOpacity>
            {summaries.map(sum => (
              <TouchableOpacity
                key={sum.medicineId}
                style={[s.chip, selectedId === sum.medicineId && { backgroundColor: sum.color, borderColor: sum.color }]}
                onPress={() => setSelectedId(p => p === sum.medicineId ? null : sum.medicineId)}
                activeOpacity={0.8}
              >
                <View style={[s.chipDot, { backgroundColor: sum.color, opacity: selectedId === sum.medicineId ? 0 : 1 }]} />
                <Text style={[s.chipTxt, selectedId === sum.medicineId && s.chipTxtActive]}>
                  {sum.medicineName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Content */}
        {loading ? (
          <View style={s.loadBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={s.loadTxt}>Loading data…</Text>
          </View>
        ) : medicines.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>💊</Text>
            <Text style={s.emptyTitle}>No medicines yet</Text>
            <Text style={s.emptyDesc}>Add medicines to start tracking adherence.</Text>
          </View>
        ) : logs.length < 3 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>📈</Text>
            <Text style={s.emptyTitle}>Not enough data yet</Text>
            <Text style={s.emptyDesc}>Keep logging doses — charts appear after a few days.</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLbl}>By Medicine</Text>
            {displayedMeds.map(sum => (
              <MedicineCard
                key={sum.medicineId}
                s={sum}
                logs={logs}
                startDate={startDate}
                endDate={endDate}
                chartWidth={chartWidth}
              />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  // Navbar
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.primary,
  },
  backBtn:   { padding: 4, width: 36 },
  backArrow: { fontSize: 22, color: Colors.white },
  navTitle:  { fontSize: 18, fontWeight: '700', color: Colors.white },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  // Segment
  segRow: {
    flexDirection: 'row', backgroundColor: Colors.inputBg,
    borderRadius: 12, padding: 3, marginBottom: 16,
  },
  seg:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segActive:    { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segTxt:       { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  segTxtActive: { color: Colors.textPrimary, fontWeight: '700' },

  // Hero card
  heroCard: {
    backgroundColor: Colors.primary, borderRadius: 22, marginBottom: 16,
    shadowColor: Colors.primary, shadowOpacity: 0.35,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  heroTop:     { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 16 },
  heroLabel:   { fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  heroSub:     { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  heroRingWrap:{ width: 90, height: 90, marginLeft: 12 },
  heroPct:     { fontSize: 19, fontWeight: '800', color: Colors.white },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14, paddingHorizontal: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 2 },
  statLbl:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500', textAlign: 'center' },
  statDiv:  { width: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 2 },

  // Filter chips
  chipScroll:    { marginBottom: 16 },
  chipContent:   { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  chipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipDot:       { width: 6, height: 6, borderRadius: 3 },
  chipTxt:       { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  chipTxtActive: { color: Colors.white, fontWeight: '600' },

  // Loading / empty
  loadBox:    { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loadTxt:    { fontSize: 13, color: Colors.textMuted },
  emptyBox:   { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyDesc:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },

  sectionLbl: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginLeft: 2,
  },
});
