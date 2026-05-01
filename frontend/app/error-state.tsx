import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, radius, spacing, type } from '../src/theme';

const STATES: any = {
  'no-rooms': { icon: 'door-closed', title: 'No rooms yet', sub: 'Be the first — create a room and invite friends!', cta: 'Create Room', to: '/game-modes' },
  'payment-failed': { icon: 'credit-card-off', title: 'Payment failed', sub: 'We could not process your payment. Please try again.', cta: 'Retry', to: '/(tabs)/shop', danger: true },
  'connection-lost': { icon: 'wifi-off', title: 'Connection lost', sub: 'Check your internet and try again.', cta: 'Retry', to: '/(tabs)', danger: true },
  'reconnecting': { icon: 'refresh', title: 'Reconnecting...', sub: 'Hold on, we are getting you back into the match.', cta: 'Go Home', to: '/(tabs)' },
  'match-cancelled': { icon: 'cancel', title: 'Match cancelled', sub: 'The host cancelled the match. You were not charged.', cta: 'Browse Rooms', to: '/(tabs)/rooms' },
};

export default function ErrorState() {
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const state = STATES[kind || 'no-rooms'] || STATES['no-rooms'];

  return (
    <ScreenBg>
      <SafeAreaView style={styles.container} testID="error-state-screen">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.center}>
          <View style={[styles.iconCircle, state.danger && { borderColor: colors.error }]}>
            <MaterialCommunityIcons name={state.icon} size={60} color={state.danger ? colors.error : colors.textDim} />
          </View>
          <Text style={styles.title}>{state.title}</Text>
          <Text style={styles.sub}>{state.sub}</Text>
          <GradientButton label={state.cta} onPress={() => router.replace(state.to)} style={{ marginTop: spacing.xl }} size="lg" />
        </View>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  title: { ...type.h2, color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  sub: { ...type.body, color: colors.textDim, marginTop: spacing.sm, textAlign: 'center' },
});
