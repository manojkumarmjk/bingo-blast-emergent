// Push notification scaffolding for Bingo Blast.
// Registers the device for Expo Push Notifications and sends the token
// to the backend so future retention campaigns can target users.
// NOTE: Actual delivery requires a native/dev build (not supported in Expo Go for SDK 53+).
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from './api';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushTokenForUser(userId: string): Promise<string | null> {
  // Skip on web and simulators — Expo Push tokens require a real device.
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Bingo Blast',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2E93',
      });
    }

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult.data;
    if (!token) return null;

    try {
      await api.pushRegister(userId, token, 'expo');
    } catch {
      // Non-fatal — user can still play without push.
    }
    return token;
  } catch {
    return null;
  }
}
