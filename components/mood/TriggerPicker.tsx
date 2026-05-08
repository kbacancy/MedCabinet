import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

const TRIGGERS = [
  { key: 'work',          label: 'Work',          emoji: '💼' },
  { key: 'family',        label: 'Family',        emoji: '👨‍👩‍👧' },
  { key: 'health',        label: 'Health',        emoji: '🏥' },
  { key: 'finances',      label: 'Finances',      emoji: '💰' },
  { key: 'relationships', label: 'Relationships', emoji: '❤️' },
  { key: 'other',         label: 'Something else', emoji: '💭' },
];

type Props = { value: string | null; onChange: (v: string | null) => void };

export function TriggerPicker({ value, onChange }: Props) {
  const hasEvent = value !== null && value !== 'none';

  return (
    <View style={s.container}>
      {/* Yes / No cards */}
      <View style={s.yesNoRow}>
        <TouchableOpacity
          style={[s.yesNoCard, hasEvent && s.yesNoActive]}
          onPress={() => onChange(value === null || value === 'none' ? 'other' : value)}
          activeOpacity={0.75}
        >
          <Text style={s.yesNoEmoji}>🙋</Text>
          <Text style={[s.yesNoLabel, hasEvent && s.yesNoLabelActive]}>Yes, something happened</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.yesNoCard, value === 'none' && s.yesNoActive]}
          onPress={() => onChange('none')}
          activeOpacity={0.75}
        >
          <Text style={s.yesNoEmoji}>🤷</Text>
          <Text style={[s.yesNoLabel, value === 'none' && s.yesNoLabelActive]}>Nothing specific</Text>
        </TouchableOpacity>
      </View>

      {/* Category picker — shown only when "yes" */}
      {hasEvent && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>What area?</Text>
          <View style={s.grid}>
            {TRIGGERS.map(t => {
              const active = value === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => onChange(t.key)}
                  activeOpacity={0.75}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text style={s.chipEmoji}>{t.emoji}</Text>
                  <Text style={[s.chipText, active && s.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 8 },
  yesNoRow: { flexDirection: 'row', gap: 12 },
  yesNoCard: {
    flex: 1, alignItems: 'center', gap: 8,
    paddingVertical: 20, borderRadius: 16,
    backgroundColor: Colors.inputBg, borderWidth: 2, borderColor: 'transparent',
  },
  yesNoActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  yesNoEmoji: { fontSize: 32 },
  yesNoLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  yesNoLabelActive: { color: Colors.primaryDark },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: 10, marginLeft: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 24, borderWidth: 1.5,
    backgroundColor: Colors.inputBg, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipEmoji: { fontSize: 15 },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
});
