import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const LABELS = ['', 'Very poor', 'Poor', 'Fair', 'Good', 'Great'];
const DESCS  = ['', "Barely slept — running on empty", "Restless night, groggy today", "Some sleep but not enough", "Slept well, feel decent", "Slept great, fully rested!"];

type Props = { value: number; onChange: (v: number) => void };

export function SleepRating({ value, onChange }: Props) {
  return (
    <View style={s.container}>
      <View style={s.stars}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={0.75} style={s.starBtn}>
            <Ionicons
              name={i <= value ? 'moon' : 'moon-outline'}
              size={40}
              color={i <= value ? '#7C5CBF' : Colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.labelCard}>
        {value > 0 ? (
          <>
            <Text style={s.ratingLabel}>{LABELS[value]}</Text>
            <Text style={s.ratingDesc}>{DESCS[value]}</Text>
          </>
        ) : (
          <Text style={s.placeholder}>Tap a moon to rate your sleep</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 8, alignItems: 'center' },
  stars: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  starBtn: { padding: 4 },
  labelCard: {
    width: '100%', backgroundColor: Colors.white,
    borderRadius: 16, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  ratingLabel: { fontSize: 18, fontWeight: '700', color: '#7C5CBF', marginBottom: 6 },
  ratingDesc:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  placeholder: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
});
