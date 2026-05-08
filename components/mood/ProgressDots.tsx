import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

type Props = { total: number; current: number };

export function ProgressDots({ total, current }: Props) {
  return (
    <View style={s.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i < current
              ? s.done
              : i === current
              ? s.active
              : s.inactive,
          ]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: { borderRadius: 6 },
  active:   { width: 24, height: 8, backgroundColor: Colors.primary },
  done:     { width: 8,  height: 8, backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary },
  inactive: { width: 8,  height: 8, backgroundColor: Colors.border },
});
