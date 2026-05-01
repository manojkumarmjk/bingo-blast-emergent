// Reusable loading and error UI for screens that fetch data
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from './theme';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.center} testID="loading-state">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <View style={styles.center} testID="error-state">
      <MaterialCommunityIcons name="alert-circle" size={56} color={colors.error} />
      <Text style={styles.title}>Could not load</Text>
      <Text style={styles.subtitle}>{error}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn} testID="retry-btn">
          <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: 12 },
  text: { ...type.body, color: colors.textDim, marginTop: 12 },
  title: { ...type.h3, color: colors.text, marginTop: 8 },
  subtitle: { ...type.caption, color: colors.textDim, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, marginTop: 8 },
  retryText: { ...type.body, color: '#fff', fontWeight: '700' as const },
});
