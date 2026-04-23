import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { useMedicines, daysUntilExpiry } from '../../hooks/useMedicines';
import { checkInteractions } from '../../lib/interactions';
import PlusIcon from '../../components/PlusIcon';

function TabIcon({ emoji }: { emoji: string }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

function CabinetTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? Colors.primary : Colors.tabInactive;
  const bg = focused ? Colors.primary : color;
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.medBag, { backgroundColor: bg }]}>
        <PlusIcon size={12} color="#fff" />
      </View>
    </View>
  );
}

function AlertsTabIcon() {
  const { medicines } = useMedicines();
  const expiryCount = medicines.filter(m => daysUntilExpiry(m.expiry_date) <= 30).length;
  const interactionCount = checkInteractions(medicines.map(m => m.name)).length;
  const total = expiryCount + interactionCount;

  return (
    <View style={styles.iconWrap}>
      <Text style={styles.iconEmoji}>🔔</Text>
      {total > 0 && (
        <View style={styles.alertDot}>
          <Text style={styles.alertDotText}>{total > 9 ? '9+' : total}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Cabinet',
          tabBarIcon: ({ focused }) => <CabinetTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan', tabBarIcon: () => <TabIcon emoji="📷" /> }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarIcon: () => <AlertsTabIcon /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: () => <TabIcon emoji="👤" /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 20 },
  medBag: {
    width: 26, height: 24, borderRadius: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  alertDot: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.danger, borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  alertDotText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
});
