import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

type Props = { size?: number; color?: string };

export default function PlusIcon({ size = 18, color = Colors.white }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.horizontal, { width: size, height: size * 0.25, backgroundColor: color, borderRadius: size * 0.1 }]} />
      <View style={[styles.vertical, { width: size * 0.25, height: size, backgroundColor: color, borderRadius: size * 0.1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  horizontal: { position: 'absolute' },
  vertical: { position: 'absolute' },
});
