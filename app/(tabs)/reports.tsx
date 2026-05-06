import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';

type ReportCardProps = {
  emoji: string;
  title: string;
  description: string;
  onPress?: () => void;
  comingSoon?: boolean;
};

function ReportCard({ emoji, title, description, onPress, comingSoon }: ReportCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, comingSoon && styles.cardDimmed]}
      onPress={onPress}
      activeOpacity={comingSoon ? 1 : 0.75}
      disabled={comingSoon}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
        <View style={styles.cardText}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            {comingSoon && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Soon</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDesc}>{description}</Text>
        </View>
      </View>
      {!comingSoon && <Text style={styles.arrow}>›</Text>}
    </TouchableOpacity>
  );
}

export default function ReportsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>Insights and documents for your health</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Analytics</Text>
        <View style={styles.group}>
          <ReportCard
            emoji="📊"
            title="Adherence Charts"
            description="Track dose history and weekly trends per medicine"
            onPress={() => router.push('/reports/charts' as any)}
          />
        </View>

        <Text style={styles.sectionLabel}>Documents</Text>
        <View style={styles.group}>
          <ReportCard
            emoji="📄"
            title="Health Report PDF"
            description="Generate a shareable report for your next doctor visit"
            onPress={() => router.push('/reports/pdf' as any)}
          />
        </View>

        <Text style={styles.sectionLabel}>Journal</Text>
        <View style={styles.group}>
          <ReportCard
            emoji="📓"
            title="Symptom Journal"
            description="Log how you feel and correlate with medicines"
            onPress={() => router.push('/journal/index' as any)}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  group: {
    backgroundColor: Colors.white, borderRadius: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  cardDimmed: { opacity: 0.5 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  cardEmoji: { fontSize: 28 },
  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  badge: {
    backgroundColor: Colors.warningLight, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  arrow: { fontSize: 20, color: Colors.textMuted },
});
