import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Medicine } from '../hooks/useMedicines';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
const EXPIRY_ALERTS_ENABLED_KEY = 'expiry_alerts_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('medicine-reminders', {
    name: 'Medicine Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('refill-alerts', {
    name: 'Refill Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('expiry-alerts', {
    name: 'Expiry Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export async function areExpiryAlertsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(EXPIRY_ALERTS_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
}

export async function setExpiryAlertsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(EXPIRY_ALERTS_ENABLED_KEY, String(enabled));
}

export async function scheduleMedicineNotifications(medicine: Medicine): Promise<void> {
  const enabled = await areNotificationsEnabled();
  if (!enabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await cancelMedicineNotifications(medicine.id);

  // Daily reminder at 9 AM
  await Notifications.scheduleNotificationAsync({
    identifier: `reminder-${medicine.id}`,
    content: {
      title: `Time to take ${medicine.name}`,
      body: medicine.dosage ? `Dosage: ${medicine.dosage}` : "Don't forget your medicine",
      sound: 'default',
      data: { medicineId: medicine.id, type: 'reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      channelId: 'medicine-reminders',
    },
  });

  // Refill alert if quantity is already at or below threshold
  if (medicine.quantity > 0 && medicine.quantity <= medicine.refill_alert_at) {
    await Notifications.scheduleNotificationAsync({
      identifier: `refill-${medicine.id}`,
      content: {
        title: `Refill needed: ${medicine.name}`,
        body: `Only ${medicine.quantity} tablets remaining. Time to refill!`,
        sound: 'default',
        data: { medicineId: medicine.id, type: 'refill' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        channelId: 'refill-alerts',
      },
    });
  }

  // Expiry alert — notify 30 days before expiry
  const expiryAlertsOn = await areExpiryAlertsEnabled();
  if (expiryAlertsOn && medicine.expiry_date) {
    const parts = medicine.expiry_date.split('/');
    if (parts.length === 3) {
      const expiryDate = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
      const alertDate = new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      alertDate.setHours(9, 0, 0, 0);
      if (alertDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `expiry-${medicine.id}`,
          content: {
            title: `${medicine.name} expiring soon`,
            body: `Expires on ${medicine.expiry_date}. Check your cabinet.`,
            sound: 'default',
            data: { medicineId: medicine.id, type: 'expiry' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alertDate,
            channelId: 'expiry-alerts',
          },
        });
      }
    }
  }
}

export async function cancelMedicineNotifications(medicineId: string): Promise<void> {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(`reminder-${medicineId}`).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(`refill-${medicineId}`).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(`expiry-${medicineId}`).catch(() => {}),
  ]);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function rescheduleAllNotifications(medicines: Medicine[]): Promise<void> {
  await cancelAllNotifications();
  for (const med of medicines) {
    await scheduleMedicineNotifications(med);
  }
}
