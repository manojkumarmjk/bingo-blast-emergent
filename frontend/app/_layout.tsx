import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game-modes" />
        <Stack.Screen name="create-room" />
        <Stack.Screen name="invite-friends" />
        <Stack.Screen name="waiting-room" />
        <Stack.Screen name="game" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="win" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="spin-wheel" />
        <Stack.Screen name="tournaments" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="error-state" />
        <Stack.Screen name="missions" />
        <Stack.Screen name="battle-pass" />
        <Stack.Screen name="collections" />
        <Stack.Screen name="streak" />
      </Stack>
    </SafeAreaProvider>
  );
}
