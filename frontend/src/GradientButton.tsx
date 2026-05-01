import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadows, type } from './theme';

type Variant = 'primary' | 'gold' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function GradientButton({
  label, onPress, variant = 'primary', icon, style, textStyle,
  loading, disabled, testID, size = 'md',
}: Props) {
  const pad = size === 'sm' ? { paddingVertical: 10, paddingHorizontal: 20 }
    : size === 'lg' ? { paddingVertical: 18, paddingHorizontal: 36 }
    : { paddingVertical: 14, paddingHorizontal: 28 };

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        testID={testID}
        disabled={disabled || loading}
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.secondary, pad, style, (disabled || loading) && { opacity: 0.5 }]}>
        {loading ? <ActivityIndicator color={colors.primary} /> : (
          <View style={styles.row}>
            {icon}
            <Text style={[styles.secondaryText, textStyle]}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        testID={testID}
        disabled={disabled || loading}
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.ghost, pad, style, (disabled || loading) && { opacity: 0.5 }]}>
        {loading ? <ActivityIndicator color={colors.text} /> : (
          <View style={styles.row}>
            {icon}
            <Text style={[styles.ghostText, textStyle]}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const grad = variant === 'gold' ? gradients.gold : gradients.primary;
  const shadow = variant === 'gold' ? shadows.glowGold : shadows.glowPrimary;
  const textColor = variant === 'gold' ? colors.onGold : colors.text;

  return (
    <TouchableOpacity
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.85}
      style={[shadow, style, (disabled || loading) && { opacity: 0.5 }]}>
      <LinearGradient
        colors={grad as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.primary, pad]}>
        {loading ? <ActivityIndicator color={textColor} /> : (
          <View style={styles.row}>
            {icon}
            <Text style={[{ ...type.title, color: textColor }, textStyle]}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  secondary: {
    borderRadius: radius.pill, borderWidth: 2, borderColor: colors.primary,
    backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center',
  },
  secondaryText: { ...type.title, color: colors.primary },
  ghost: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ghostText: { ...type.title, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
