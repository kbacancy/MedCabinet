import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useMedicines, daysUntilExpiry } from '../../hooks/useMedicines';
import { checkInteractions, type Interaction } from '../../lib/interactions';
import { checkInteractionsAI } from '../../lib/groq';

const CATEGORY_EMOJIS: Record<string, string> = {
  'Antibiotic': '🏥', 'Blood Pressure': '💊', 'Cholesterol': '💉',
  'Diabetes': '⬛', 'Pain Relief': '🔴', 'Supplements': '🟢',
  'Vitamins': '🟡', 'Other': '💊',
};

export default function AlertsScreen() {
  const router = useRouter();
  const { medicines, loading } = useMedicines();
  const [tipDismissed, setTipDismissed] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const lastCheckedKey = useRef('');

  const expiryAlerts = medicines
    .map(m => ({ ...m, daysLeft: daysUntilExpiry(m.expiry_date) }))
    .filter(m => m.daysLeft <= 30 && m.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  useEffect(() => {
    if (loading || medicines.length < 2) {
      setInteractions(medicines.length < 2 ? [] : checkInteractions(medicines.map(m => m.name)));
      return;
    }
    const names = medicines.map(m => m.name).sort().join(',');
    if (names === lastCheckedKey.current) return;
    lastCheckedKey.current = names;

    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'your_groq_api_key_here';

    if (hasValidKey) {
      setAiLoading(true);
      checkInteractionsAI(medicines.map(m => m.name))
        .then(results => {
          setInteractions(results.length > 0 ? results : checkInteractions(medicines.map(m => m.name)));
        })
        .catch(() => setInteractions(checkInteractions(medicines.map(m => m.name))))
        .finally(() => setAiLoading(false));
    } else {
      setInteractions(checkInteractions(medicines.map(m => m.name)));
    }
  }, [medicines, loading]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.headerTitle}>Alerts</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {aiLoading && (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.aiLoadingText}>Checking interactions with AI...</Text>
            </View>
          )}

          {interactions.map((item, i) => (
            <View key={i} style={styles.interactionCard}>
              <View style={styles.interactionIconBox}>
                <Text style={styles.interactionIcon}>⚠️</Text>
              </View>
              <View style={styles.interactionBody}>
                <View style={styles.interactionTitleRow}>
                  <Text style={styles.interactionTitle}>
                    Interaction detected —{'\n'}{item.drugA} + {item.drugB}
                  </Text>
                  <View style={[styles.severityBadge, item.severity === 'high' && styles.severityHigh]}>
                    <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.interactionDesc}>{item.message}</Text>
                <Text style={styles.aiPoweredText}>⚡ AI-powered analysis</Text>
              </View>
            </View>
          ))}

          {interactions.length === 0 && expiryAlerts.length === 0 && !tipDismissed && (
            <View style={styles.allClearCard}>
              <Text style={styles.allClearEmoji}>✅</Text>
              <Text style={styles.allClearTitle}>All Clear</Text>
              <Text style={styles.allClearDesc}>No interactions or upcoming expiries detected.</Text>
            </View>
          )}

          {expiryAlerts.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Medication Expiry</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{expiryAlerts.length} Alert{expiryAlerts.length > 1 ? 's' : ''}</Text>
                </View>
              </View>

              {expiryAlerts.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.expiryCard}
                  onPress={() => router.push(`/medicine/${item.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.medicineIconBox}>
                    <Text style={styles.medicineEmoji}>{CATEGORY_EMOJIS[item.category] ?? '💊'}</Text>
                  </View>
                  <View style={styles.expiryInfo}>
                    <Text style={styles.expiryName}>{item.name}</Text>
                    <Text style={styles.expiryMeta}>{item.category} • {item.dosage}</Text>
                  </View>
                  <View style={[styles.expiryBadge, item.daysLeft <= 7 && styles.expiryBadgeUrgent]}>
                    <Text style={[styles.expiryBadgeText, item.daysLeft <= 7 && styles.expiryBadgeTextUrgent]}>
                      {item.daysLeft <= 0 ? 'EXPIRED' : `expires in ${item.daysLeft} days`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {!tipDismissed && (
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Text style={styles.tipIcon}>💡</Text>
                <TouchableOpacity onPress={() => setTipDismissed(true)} style={styles.dismissBtn}>
                  <Text style={styles.dismissIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.tipTitle}>Stay Safe</Text>
              <Text style={styles.tipDesc}>Check for interactions whenever you add a new medication to your cabinet.</Text>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  allClearCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 32,
    alignItems: 'center', marginBottom: 16, gap: 8,
  },
  allClearEmoji: { fontSize: 40 },
  allClearTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  allClearDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  interactionCard: {
    backgroundColor: Colors.dangerLight, borderRadius: 16, padding: 16,
    flexDirection: 'row', gap: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#F5C0BF',
  },
  interactionIconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  interactionIcon: { fontSize: 22 },
  interactionBody: { flex: 1 },
  interactionTitle: { fontSize: 15, fontWeight: '700', color: Colors.danger, marginBottom: 6, lineHeight: 20 },
  interactionDesc: { fontSize: 13, color: Colors.danger, lineHeight: 18, marginBottom: 8, opacity: 0.85 },
  learnMoreText: { fontSize: 13, color: Colors.danger, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  badge: { backgroundColor: Colors.inputBg, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  expiryCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  medicineIconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  medicineEmoji: { fontSize: 22 },
  expiryInfo: { flex: 1 },
  expiryName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  expiryMeta: { fontSize: 12, color: Colors.textSecondary },
  expiryBadge: { backgroundColor: Colors.dangerLight, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  expiryBadgeUrgent: { backgroundColor: Colors.danger },
  expiryBadgeText: { fontSize: 11, color: Colors.danger, fontWeight: '600' },
  expiryBadgeTextUrgent: { color: Colors.white },
  tipCard: { backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 16, marginTop: 12 },
  tipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tipIcon: { fontSize: 20 },
  dismissBtn: { padding: 4 },
  dismissIcon: { fontSize: 14, color: Colors.textSecondary },
  tipTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  tipDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  aiLoadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  aiLoadingText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  interactionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  severityBadge: { backgroundColor: '#FFF3E0', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
  severityHigh: { backgroundColor: Colors.dangerLight },
  severityText: { fontSize: 10, fontWeight: '700', color: Colors.danger },
  aiPoweredText: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
});
