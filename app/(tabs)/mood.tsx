import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { supabase, type MoodLog } from '../../lib/supabase';

type IoniconName = keyof typeof Ionicons.glyphMap;

const SEVERITY_COLOR: Record<string, string> = {
  mild:     '#388E3C',
  moderate: '#E65100',
  high:     '#C62828',
};

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', calm: '😌', anxious: '😰', sad: '😔',
  angry: '😤', overwhelmed: '😕', neutral: '😐',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function calcStreak(logs: MoodLog[]): number {
  if (!logs.length) return 0;
  const days = new Set(logs.map(l => new Date(l.recorded_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function MoodHistoryCard({ log }: { log: MoodLog }) {
  const emoji = log.emoji ?? MOOD_EMOJI[log.primary_mood.toLowerCase()] ?? '😐';
  const sevColor = SEVERITY_COLOR[log.severity] ?? Colors.textMuted;

  return (
    <View style={hc.card}>
      <View style={hc.left}>
        <Text style={hc.emoji}>{emoji}</Text>
      </View>
      <View style={hc.mid}>
        <Text style={hc.mood}>{log.primary_mood.charAt(0).toUpperCase() + log.primary_mood.slice(1)}</Text>
        {log.insight ? (
          <Text style={hc.insight} numberOfLines={2}>{log.insight}</Text>
        ) : null}
      </View>
      <View style={hc.right}>
        <Text style={hc.time}>{timeAgo(log.recorded_at)}</Text>
        <View style={[hc.dot, { backgroundColor: sevColor }]} />
      </View>
    </View>
  );
}

const hc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  left:  { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  mid:   { flex: 1 },
  mood:  { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  insight: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  right: { alignItems: 'flex-end', gap: 6 },
  time:  { fontSize: 11, color: Colors.textMuted },
  dot:   { width: 8, height: 8, borderRadius: 4 },
});

export default function MoodScreen() {
  const router = useRouter();
  const [logs, setLogs]       = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(30);
    setLogs((data as MoodLog[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchLogs(); }, [fetchLogs]));

  const streak     = calcStreak(logs);
  const todayLog   = logs.find(l => isToday(l.recorded_at));
  const recentLogs = logs.slice(0, 10);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Mental Wellness</Text>
        <Text style={s.headerSub}>Track your emotions, lift your spirit</Text>

        {/* Streak pill */}
        {streak > 0 && (
          <View style={s.streakPill}>
            <Text style={s.streakText}>🔥 {streak}-day streak</Text>
          </View>
        )}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Today card */}
        <View style={s.todayCard}>
          {todayLog ? (
            <>
              <View style={s.todayTop}>
                <Text style={s.todayEmoji}>{todayLog.emoji ?? '😐'}</Text>
                <View style={s.todayInfo}>
                  <Text style={s.todayLabel}>Today you feel</Text>
                  <Text style={s.todayMood}>
                    {todayLog.primary_mood.charAt(0).toUpperCase() + todayLog.primary_mood.slice(1)}
                  </Text>
                </View>
                <View style={[s.todaySeverity, { backgroundColor: SEVERITY_COLOR[todayLog.severity] + '20' }]}>
                  <Text style={[s.todaySeverityText, { color: SEVERITY_COLOR[todayLog.severity] }]}>
                    {todayLog.severity}
                  </Text>
                </View>
              </View>
              {todayLog.wellness_message ? (
                <Text style={s.todayMessage}>{todayLog.wellness_message}</Text>
              ) : null}
              <TouchableOpacity
                style={s.checkInAgainBtn}
                onPress={() => router.push('/mood/assessment' as any)}
                activeOpacity={0.8}
              >
                <Text style={s.checkInAgainText}>Check In Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.nothingYetEmoji}>🌅</Text>
              <Text style={s.nothingYetTitle}>How are you feeling today?</Text>
              <Text style={s.nothingYetSub}>Take a quick 60-second mood check-in</Text>
              <TouchableOpacity
                style={s.startBtn}
                onPress={() => router.push('/mood/assessment' as any)}
                activeOpacity={0.82}
              >
                <Ionicons name="happy-outline" size={18} color="#fff" />
                <Text style={s.startBtnText}>Start Check-In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* History */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : recentLogs.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>Recent Check-Ins</Text>
            {recentLogs.map(log => (
              <MoodHistoryCard key={log.id} log={log} />
            ))}
          </>
        ) : (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🌱</Text>
            <Text style={s.emptyTitle}>Start your wellness journey</Text>
            <Text style={s.emptySub}>Your mood history will appear here after your first check-in</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 24,
    backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 3 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  streakPill: {
    alignSelf: 'flex-start', marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 12,
  },
  streakText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  todayCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  todayTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  todayEmoji: { fontSize: 44 },
  todayInfo: { flex: 1 },
  todayLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  todayMood:  { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  todaySeverity: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  todaySeverityText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  todayMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 14 },
  checkInAgainBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  checkInAgainText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  nothingYetEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 10 },
  nothingYetTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  nothingYetSub:   { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14,
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginLeft: 2,
  },

  emptyState: { alignItems: 'center', paddingTop: 32, paddingBottom: 16, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
});
