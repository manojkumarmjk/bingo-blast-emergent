// Push notification scaffolding for Bingo Blast.
// Registers the device for Expo Push Notifications and sends the token
// to the backend so future retention campaigns can target users.
//
// IMPORTANT: `expo-notifications` remote-push APIs were REMOVED from Expo Go in
// SDK 53. Importing the module at the top level in Expo Go throws an uncaught
// error. We therefore require() it lazily inside the helper, and we short-circuit
// entirely when running in Expo Go or on web/simulator. Delivery requires a
// custom dev/native build — this file only handles token registration.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

// Detect Expo Go at runtime. `Constants.appOwnership` is 'expo' inside Expo Go
// and 'standalone' / undefined in a native build.
function isExpoGo(): boolean {
  try {
    return (Constants as any)?.appOwnership === 'expo' ||
           (Constants as any)?.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
}

export async function registerPushTokenForUser(userId: string): Promise<string | null> {
  // Skip entirely on web and in Expo Go (expo-notifications is unusable there).
  if (Platform.OS === 'web') return null;
  if (isExpoGo()) return null;

  // Lazy-require so the failing module isn't evaluated in Expo Go.
  let Notifications: any;
  let Device: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Device = require('expo-device');
  } catch {
    return null;
  }
  if (!Notifications || !Device) return null;

  try {
    if (!Device.isDevice) return null;

    // Configure foreground presentation once.
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch { /* no-op */ }

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
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
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
    const token = tokenResult?.data;
    if (!token) return null;

    try {
      await api.pushRegister(userId, token, 'expo');
    } catch {
      // Non-fatal — user can still play without push.
    }
    return token;
  } catch {
    // Any failure (permissions denied, Expo Go, simulator, no network) is silent.
    return null;
  }
}
