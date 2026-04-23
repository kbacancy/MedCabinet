import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

type Medicine = {
  id: string;
  name: string;
  quantity: number;
  daysLeft: number;
  category: string;
  dosage: string;
};

type Props = {
  medicine: Medicine;
  onPress: () => void;
};

function getDaysLeftStyle(daysLeft: number) {
  if (daysLeft <= 7) return { bg: Colors.dangerLight, text: Colors.danger };
  if (daysLeft <= 30) return { bg: '#FFF3E0', text: Colors.warning };
  return { bg: Colors.primaryLight, text: Colors.primary };
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Antibiotic': '🏥',
  'Blood Pressure': '💊',
  'Cholesterol': '💉',
  'Diabetes': '⬛',
  'Pain Relief': '🔴',
  'Supplements': '🟢',
  'Vitamins': '🟡',
  'Other': '💊',
};

export default function MedicineCard({ medicine, onPress }: Props) {
  const badge = getDaysLeftStyle(medicine.daysLeft);
  const emoji = CATEGORY_EMOJIS[medicine.category] ?? '💊';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconBox}>
        <Text style={styles.iconEmoji}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{medicine.name}</Text>
        <Text style={styles.meta}>{medicine.quantity} tablets remaining</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>
            {medicine.daysLeft} DAYS LEFT
          </Text>
        </View>
        <Text style={styles.category}>{medicine.category}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  iconEmoji: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 3 },
  meta: { fontSize: 12, color: Colors.textSecondary },
  right: { alignItems: 'flex-end', gap: 4 },
  badge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  category: { fontSize: 11, color: Colors.textSecondary },
});
