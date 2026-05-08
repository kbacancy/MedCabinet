import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

const MOODS = [
  { key: 'happy',       emoji: '😊', label: 'Happy',       bg: '#E8F5E9', border: '#66BB6A' },
  { key: 'calm',        emoji: '😌', label: 'Calm',        bg: '#E3F2FD', border: '#42A5F5' },
  { key: 'anxious',     emoji: '😰', label: 'Anxious',     bg: '#FFF3E0', border: '#FFA726' },
  { key: 'sad',         emoji: '😔', label: 'Sad',         bg: '#E8EAF6', border: '#7986CB' },
  { key: 'angry',       emoji: '😤', label: 'Angry',       bg: '#FFEBEE', border: '#EF5350' },
  { key: 'overwhelmed', emoji: '😕', label: 'Overwhelmed', bg: '#F3E5F5', border: '#AB47BC' },
];

type Props = { selected: string; onSelect: (key: string) => void };

export function MoodCardGrid({ selected, onSelect }: Props) {
  return (
    <View style={s.grid}>
      {MOODS.map(m => {
        const isSelected = selected === m.key;
        return (
          <TouchableOpacity
            key={m.key}
            onPress={() => onSelect(m.key)}
            activeOpacity={0.75}
            style={[
              s.card,
              { backgroundColor: m.bg, borderColor: isSelected ? m.border : 'transparent' },
              isSelected && s.cardSelected,
            ]}
          >
            <Text style={s.emoji}>{m.emoji}</Text>
            <Text style={[s.label, isSelected && { color: m.border, fontWeight: '700' }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, marginTop: 8,
  },
  card: {
    width: '47%', borderRadius: 16,
    paddingVertical: 20, alignItems: 'center', gap: 8,
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardSelected: {
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
    transform: [{ scale: 1.02 }],
  },
  emoji: { fontSize: 34 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
});
