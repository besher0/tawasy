import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../lib/api';

export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      return;
    }

    async function register() {
      const permissions = await Notifications.getPermissionsAsync();
      let status = permissions.status;

      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }

      if (status !== 'granted') {
        return;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      await api.post('/devices/push-token', {
        token: tokenResponse.data,
        platform: Platform.OS,
      });
    }

    void register();
  }, [enabled]);
}
