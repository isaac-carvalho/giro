import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

export const PushNotificationService = {
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('corridas', {
        name: 'Pedidos de corrida',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#D4AF37'
      });
      await Notifications.setNotificationChannelAsync('sos_alerts', {
        name: 'Alertas críticos SOS',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2D55',
        sound: 'default'
      });
    }

    const { status: existente } = await Notifications.getPermissionsAsync();
    let final = existente;
    if (existente !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;

    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await apiClient.post('/auth/push-token', { token }).catch(() => undefined);
      return token;
    } catch {
      return null;
    }
  }
};
