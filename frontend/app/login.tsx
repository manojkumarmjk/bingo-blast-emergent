import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, spacing, type, media, columnColor, columnLetter, radius, shadows } from '../src/theme';
import { api, storage } from '../src/api';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const loginAsGuest = async () => {
    setLoading(true);
    try {
      const deviceId = await storage.getDeviceId();
      const user = await api.guestLogin(deviceId);
      await storage.setUser(user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Unable to continue', e.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const comingSoon = () => Alert.alert('Coming soon', 'Email / Google login will be enabled in Phase 2.');

  return (
    <ScreenBg>
      <SafeAreaView style={styles.container} testID="login-screen">
        <Image source={{ uri: media.splashBg }} style={styles.bgImg} />
        <View style={styles.overlay} />

        <View style={styles.ballsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.ball, { backgroundColor: columnColor(i) }]}>
              <Text style={styles.ballText}>{columnLetter(i)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.title}>BINGO BLAST</Text>
        <Text style={styles.sub}>Ready, set, BINGO!</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login or play as Guest</Text>

          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textDim} />
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="Email or mobile"
              placeholderTextColor={colors.textMute}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <GradientButton
            label="Login"
            onPress={comingSoon}
            testID="login-submit-btn"
            icon={<MaterialCommunityIcons name="login" size={20} color="#fff" />}
          />

          <TouchableOpacity onPress={comingSoon} style={{ alignSelf: 'center', marginTop: 10 }}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>OR</Text>
            <View style={styles.divLine} />
          </View>

          <TouchableOpacity style={[styles.socialBtn, shadows.sm]} onPress={comingSoon} testID="google-login-btn">
            <FontAwesome name="google" size={18} color="#fff" />
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>

          <GradientButton
            label="Play as Guest"
            variant="gold"
            onPress={loginAsGuest}
            loading={loading}
            testID="guest-login-btn"
            style={{ marginTop: spacing.md }}
            icon={<MaterialCommunityIcons name="rocket-launch" size={20} color={colors.onGold} />}
          />
        </View>

        <Text style={styles.footer}>By continuing you agree to our Terms & Privacy</Text>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, alignItems: 'center' },
  bgImg: { ...StyleSheet.absoluteFillObject, opacity: 0.25 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,11,46,0.7)' },
  ballsRow: { flexDirection: 'row', gap: 6, marginTop: spacing.lg },
  ball: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  title: { ...type.h2, color: colors.text, marginTop: 10 },
  sub: { ...type.body, color: colors.gold, letterSpacing: 2, marginBottom: spacing.lg },
  card: {
    width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...shadows.md,
  },
  cardTitle: { ...type.title, color: colors.text, marginBottom: spacing.md, textAlign: 'center' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surfaceHi, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4, marginBottom: spacing.md,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 12, ...type.body },
  forgot: { ...type.caption, color: colors.secondary },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  divText: { ...type.badge, color: colors.textDim },
  socialBtn: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#DB4437', paddingVertical: 14, borderRadius: radius.pill,
  },
  socialText: { ...type.body, color: '#fff', fontWeight: '700' as const },
  footer: { ...type.caption, color: colors.textDim, marginTop: spacing.lg, textAlign: 'center' },
});
