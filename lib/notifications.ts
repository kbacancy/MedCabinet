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

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export async function scheduleMedicineNotifications(medicine: Medicine): Promise<void> {
  const enabled = await areNotificationsEnabled();
  if (!enabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await cancelMedicineNotifications(medicine.id);

  // Schedule one reminder per reminder_time (defaults to 9:00 AM if not set)
  const times: string[] = medicine.reminder_times?.length ? medicine.reminder_times : ['09:00'];
  for (let i = 0; i < times.length; i++) {
    const [hourStr, minuteStr] = times[i].split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const timeLabel = formatTimeLabel(times[i]);
    await Notifications.scheduleNotificationAsync({
      identifier: `reminder-${medicine.id}-${i}`,
      content: {
        title: 'Medication Reminder',
        body: `You have a scheduled dose at ${timeLabel}. Open MedCabinet to view details.`,
        sound: 'default',
        data: { medicineId: medicine.id, type: 'reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'medicine-reminders',
      },
    });
  }

  // Refill alert if quantity is at or below threshold
  if (medicine.quantity > 0 && medicine.quantity <= medicine.refill_alert_at) {
    await Notifications.scheduleNotificationAsync({
      identifier: `refill-${medicine.id}`,
      content: {
        title: 'Refill Reminder',
        body: 'One of your medications is running low. Open MedCabinet to refill.',
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

  // Expiry alert — 30 days before expiry
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
            title: 'Medication Expiry Alert',
            body: 'A medication in your cabinet is expiring soon. Open MedCabinet to review.',
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
  const cancellations: Promise<void>[] = [
    // Legacy single-reminder identifier
    Notifications.cancelScheduledNotificationAsync(`reminder-${medicineId}`).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(`refill-${medicineId}`).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(`expiry-${medicineId}`).catch(() => {}),
  ];
  // Time-indexed reminders (up to 8 slots)
  for (let i = 0; i < 8; i++) {
    cancellations.push(
      Notifications.cancelScheduledNotificationAsync(`reminder-${medicineId}-${i}`).catch(() => {})
    );
  }
  await Promise.all(cancellations);
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
