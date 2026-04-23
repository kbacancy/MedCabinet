import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

type Props = {
  type: 'interaction' | 'expiry' | 'refill' | 'tip';
  title: string;
  message: string;
  onPress?: () => void;
  onDismiss?: () => void;
  actionLabel?: string;
};

const TYPE_CONFIG = {
  interaction: { bg: Colors.dangerLight, border: '#F5C0BF', titleColor: Colors.danger, icon: '⚠️' },
  expiry: { bg: '#FFF3E0', border: '#FDDBA0', titleColor: Colors.warning, icon: '⏰' },
  refill: { bg: Colors.primaryLight, border: Colors.primary, titleColor: Colors.primary, icon: '🔔' },
  tip: { bg: Colors.primaryLight, border: Colors.primaryLight, titleColor: Colors.primary, icon: '💡' },
};

export default function AlertBanner({ type, title, message, onPress, onDismiss, actionLabel = 'Learn more' }: Props) {
  const config = TYPE_CONFIG[type];

  return (
    <View style={[styles.card, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color: config.titleColor }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress} style={styles.action}>
          <Text style={[styles.actionText, { color: config.titleColor }]}>{actionLabel} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 20 },
  dismissBtn: { padding: 4 },
  dismissIcon: { fontSize: 14, color: Colors.textSecondary },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 6, lineHeight: 20 },
  message: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  action: {},
  actionText: { fontSize: 13, fontWeight: '600' },
});
