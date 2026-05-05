import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHealthMotivation, type HealthMotivation } from '../lib/groq';
import { Colors } from '../constants/colors';

type Props = {
  medicineCount: number;
  takenCount: number;
  adherencePercent: number;
  activeCourses: string[];
  allTaken: boolean;
};

const FALLBACKS: HealthMotivation[] = [
  { emoji: '💧', title: 'Stay Hydrated', message: 'Drink 8 glasses of water today — hydration supports medication absorption and overall wellbeing.' },
  { emoji: '😴', title: 'Rest Well', message: 'Quality sleep is medicine. Aim for 7–9 hours tonight to help your body recover and recharge.' },
  { emoji: '🥦', title: 'Eat Mindfully', message: 'Fuel your body with colorful, whole foods today. Good nutrition amplifies the benefit of your treatment.' },
  { emoji: '🚶', title: 'Move Your Body', message: 'Even a short 10-minute walk can lift your mood and support your health journey.' },
  { emoji: '🧘', title: 'Breathe & Reset', message: 'Take three slow, deep breaths right now — managing stress is an essential part of healing.' },
];

const CACHE_KEY_PREFIX = 'health_motivation_';

function todayKey(): string {
  return CACHE_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

export default function MotivationCard({ medicineCount, takenCount, adherencePercent, activeCourses, allTaken }: Props) {
  const [data, setData] = useState<HealthMotivation | null>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(0.35)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ])
    );
    if (loading) {
      loop.start();
    } else {
      loop.stop();
    }
    return () => loop.stop();
  }, [loading]);

  const fetchMotivation = async (force = false) => {
    setLoading(true);
    fadeAnim.setValue(0);

    if (!force) {
      try {
        const cached = await AsyncStorage.getItem(todayKey());
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
          return;
        }
      } catch {}
    }

    const result = await getHealthMotivation({ medicineCount, takenCount, adherencePercent, activeCourses, allTaken });
    const final = result ?? FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];

    try { await AsyncStorage.setItem(todayKey(), JSON.stringify(final)); } catch {}

    setData(final);
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  useEffect(() => { fetchMotivation(); }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.accentBar} />
        <Animated.View style={[styles.skeletonRow, { opacity: pulseAnim }]}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonTextCol}>
            <View style={[styles.skeletonLine, { width: '55%', marginBottom: 10 }]} />
            <View style={[styles.skeletonLine, { width: '92%', marginBottom: 6 }]} />
            <View style={[styles.skeletonLine, { width: '70%' }]} />
          </View>
        </Animated.View>
      </View>
    );
  }

  if (!data) return null;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Text style={styles.emoji}>{data.emoji}</Text>
        </View>
        <View style={styles.textBox}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{data.title}</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>✨ AI</Text>
            </View>
          </View>
          <Text style={styles.message}>{data.message}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={() => fetchMotivation(true)}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.refreshIcon}>↻</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 26 },
  textBox: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  aiBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  message: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  refreshBtn: { paddingRight: 14, paddingLeft: 2 },
  refreshIcon: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },
  skeletonRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  skeletonIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.inputBg,
  },
  skeletonTextCol: { flex: 1 },
  skeletonLine: {
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.inputBg,
  },
});
