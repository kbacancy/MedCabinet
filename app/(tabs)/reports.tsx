import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type IconName = keyof typeof Ionicons.glyphMap;

type FeatureCardProps = {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  tag?: string;
  tagColor?: string;
  tagBg?: string;
  onPress?: () => void;
  disabled?: boolean;
};

function FeatureCard({
  icon, iconBg, iconColor, title, description,
  tag, tagColor, tagBg, onPress, disabled,
}: FeatureCardProps) {
  return (
    <TouchableOpacity
      style={[fc.card, disabled && fc.cardDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.72}
      disabled={disabled}
    >
      {/* Icon box */}
      <View style={[fc.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      {/* Text */}
      <View style={fc.text}>
        <View style={fc.titleRow}>
          <Text style={fc.title}>{title}</Text>
          {tag && (
            <View style={[fc.tag, { backgroundColor: tagBg }]}>
              <Text style={[fc.tagTxt, { color: tagColor }]}>{tag}</Text>
            </View>
          )}
        </View>
        <Text style={fc.desc}>{description}</Text>
      </View>

      {/* Chevron */}
      {!disabled && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={fc.chevron} />
      )}
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 18,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  cardDisabled: { opacity: 0.55 },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  text:     { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title:    { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  desc:     { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  tag: {
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  tagTxt:  { fontSize: 10, fontWeight: '700' },
  chevron: { marginLeft: 6 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Reports</Text>
        <Text style={s.headerSub}>Insights and documents for your health</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Analytics */}
        <Text style={s.sectionLbl}>Analytics</Text>
        <FeatureCard
          icon="analytics"
          iconBg={Colors.primaryLight}
          iconColor={Colors.primary}
          title="Adherence Charts"
          description="Track dose history, streaks and weekly trends per medicine"
          onPress={() => router.push('/reports/charts' as any)}
        />

        {/* Documents */}
        <Text style={s.sectionLbl}>Documents</Text>
        <FeatureCard
          icon="document-text"
          iconBg="#E8F0FE"
          iconColor="#4285F4"
          title="Health Report PDF"
          description="Generate a shareable summary for your next doctor visit"
          onPress={() => router.push('/reports/pdf' as any)}
        />

        {/* Journal */}
        <Text style={s.sectionLbl}>Journal</Text>
        <FeatureCard
          icon="journal"
          iconBg="#F0E8FE"
          iconColor="#9B5CF6"
          title="Symptom Journal"
          description="Log how you feel and correlate symptoms with medicines"
          onPress={() => router.push('/journal' as any)}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20,
    backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 3 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },

  sectionLbl: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 8, marginLeft: 2,
  },
});
