import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRef } from 'react';
import { Colors } from '../../constants/colors';

const LEVELS = [
  { emoji: '😴', label: 'Drained' },
  { emoji: '😔', label: 'Low' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '⚡', label: 'Energised' },
];

type Props = { value: number; onChange: (v: number) => void };

export function EmojiSlider({ value, onChange }: Props) {
  const scaleAnims = useRef(LEVELS.map(() => new Animated.Value(1))).current;

  const handlePress = (idx: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();
    onChange(idx + 1);
  };

  return (
    <View style={s.container}>
      <View style={s.row}>
        {LEVELS.map((item, idx) => {
          const selected = value === idx + 1;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => handlePress(idx)}
              activeOpacity={0.75}
              style={s.item}
            >
              <Animated.View
                style={[
                  s.circle,
                  selected && s.circleSelected,
                  { transform: [{ scale: scaleAnims[idx] }] },
                ]}
              >
                <Text style={s.emoji}>{item.emoji}</Text>
              </Animated.View>
              <Text style={[s.label, selected && s.labelSelected]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Track bar */}
      <View style={s.track}>
        <View style={[s.fill, { width: `${((value - 1) / 4) * 100}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 4, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  item: { alignItems: 'center', gap: 6, flex: 1 },
  circle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  circleSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  emoji: { fontSize: 28 },
  label: { fontSize: 10, fontWeight: '500', color: Colors.textMuted, textAlign: 'center' },
  labelSelected: { color: Colors.primary, fontWeight: '700' },
  track: {
    height: 4, borderRadius: 2,
    backgroundColor: Colors.border, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
});
