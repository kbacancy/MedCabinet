import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useMedicines, daysUntilExpiry } from '../hooks/useMedicines';
import { checkInteractions } from '../lib/interactions';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  active: IoniconName;
  inactive: IoniconName;
  label: string;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  index:   { active: 'home',          inactive: 'home-outline',          label: 'Home'    },
  alerts:  { active: 'notifications', inactive: 'notifications-outline', label: 'Alerts'  },
  scan:    { active: 'scan',          inactive: 'scan-outline',          label: 'Scan'    },
  reports: { active: 'bar-chart',     inactive: 'bar-chart-outline',     label: 'Reports' },
  mood:    { active: 'happy',         inactive: 'happy-outline',         label: 'Mood'    },
  profile: { active: 'person',        inactive: 'person-outline',        label: 'Profile' },
};

const FAB_SIZE = 58;
const BAR_HEIGHT = 64;

function AlertBadge() {
  const { medicines } = useMedicines();
  const count =
    medicines.filter(m => daysUntilExpiry(m.expiry_date) <= 30).length +
    checkInteractions(medicines.map(m => m.name)).length;
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const isCenter = route.name === 'scan';
          const cfg = TAB_CONFIGS[route.name] ?? {
            active: 'ellipse' as IoniconName,
            inactive: 'ellipse-outline' as IoniconName,
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <View key={route.key} style={styles.fabSlot}>
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.82}
                  style={[styles.fab, focused && styles.fabFocused]}
                >
                  <Ionicons name="scan" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <View style={styles.iconArea}>
                {focused && <View style={styles.activePill} />}
                <Ionicons
                  name={focused ? cfg.active : cfg.inactive}
                  size={22}
                  color={focused ? Colors.primary : Colors.tabInactive}
                />
                {route.name === 'alerts' && <AlertBadge />}
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 32,
  },
  activePill: {
    position: 'absolute',
    width: 40,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.tabInactive,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  fabSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(FAB_SIZE / 2 + 6),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  fabFocused: {
    backgroundColor: Colors.primaryDark,
    shadowOpacity: 0.6,
  },
});
