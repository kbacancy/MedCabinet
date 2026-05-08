import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';

const SYMPTOMS = [
  { key: 'headache',     label: 'Headache',      emoji: '🤕' },
  { key: 'tired',        label: 'Tired',         emoji: '😴' },
  { key: 'chest_tight',  label: 'Chest tight',   emoji: '💨' },
  { key: 'tense',        label: 'Tense muscles', emoji: '💪' },
  { key: 'restless',     label: 'Restless',      emoji: '🏃' },
  { key: 'nauseous',     label: 'Nauseous',      emoji: '🤢' },
  { key: 'racing_heart', label: 'Heart racing',  emoji: '💓' },
  { key: 'fine',         label: 'Feeling fine',  emoji: '✅' },
];

type Props = { selected: string[]; onToggle: (updated: string[]) => void };

export function PhysicalToggle({ selected, onToggle }: Props) {
  const toggle = (key: string) => {
    if (key === 'fine') {
      onToggle(selected.includes('fine') ? [] : ['fine']);
      return;
    }
    const without = selected.filter(s => s !== 'fine');
    const next = without.includes(key)
      ? without.filter(s => s !== key)
      : [...without, key];
    onToggle(next);
  };

  return (
    <View style={s.container}>
      <View style={s.grid}>
        {SYMPTOMS.map(sym => {
          const active = selected.includes(sym.key);
          return (
            <TouchableOpacity
              key={sym.key}
              onPress={() => toggle(sym.key)}
              activeOpacity={0.75}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={s.chipEmoji}>{sym.emoji}</Text>
              <Text style={[s.chipText, active && s.chipTextActive]}>{sym.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.hint}>Select all that apply — or tap "Feeling fine" to skip</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 24, borderWidth: 1.5,
    backgroundColor: Colors.inputBg, borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  hint: {
    fontSize: 11, color: Colors.textMuted,
    marginTop: 14, textAlign: 'center', fontStyle: 'italic',
  },
});
