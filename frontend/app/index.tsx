import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, type, media, columnColor, columnLetter, shadows } from '../src/theme';
import { api, storage } from '../src/api';

export default function Splash() {
  const router = useRouter();
  const scale = useSharedValue(0.6);
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
    rotate.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);

    const boot = async () => {
      try {
        const deviceId = await storage.getDeviceId();
        const storedUser = await storage.getUser();
        const onboarded = await storage.isOnboarded();
        // Always refresh user from server
        let user = storedUser;
        if (storedUser?.id) {
          try { user = await api.getUser(storedUser.id); await storage.setUser(user); } catch { /* fallback to stored */ }
        }
        await new Promise((r) => setTimeout(r, 1800));
        if (!onboarded) {
          router.replace('/onboarding');
        } else if (!user) {
          router.replace('/login');
        } else {
          router.replace('/(tabs)');
        }
      } catch {
        router.replace('/onboarding');
      }
    };
    boot();
    // Safety: never hang on splash more than 6s
    const safety = setTimeout(async () => {
      const onboarded = await storage.isOnboarded();
      const storedUser = await storage.getUser();
      if (!onboarded) router.replace('/onboarding');
      else if (!storedUser) router.replace('/login');
      else router.replace('/(tabs)');
    }, 6000);
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ballStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.container} testID="splash-screen">
      <Image source={{ uri: media.splashBg }} style={StyleSheet.absoluteFill} blurRadius={1} />
      <LinearGradient colors={['rgba(26,11,46,0.3)', 'rgba(26,11,46,0.95)']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.orbit, ballStyle]}>
        {['B', 'I', 'N', 'G', 'O'].map((l, i) => (
          <View key={l} style={[styles.orbitBall, {
            backgroundColor: columnColor(i),
            transform: [{ rotate: `${i * 72}deg` }, { translateY: -110 }],
          }]}>
            <Text style={styles.orbitBallText}>{l}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.logoBlock, logoStyle]}>
        <View style={styles.ballsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.ball, { backgroundColor: columnColor(i) }, shadows.md]}>
              <Text style={styles.ballText}>{columnLetter(i)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.title} testID="splash-title">BINGO BLAST</Text>
        <Text style={styles.sub}>Play • Win • Repeat</Text>
      </Animated.View>

      <Animated.View style={[styles.loader, pulseStyle]} testID="loading-spinner">
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loaderText}>Loading your game...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  orbitBall: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', opacity: 0.35,
  },
  orbitBallText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  logoBlock: { alignItems: 'center', justifyContent: 'center' },
  ballsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  ball: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ballText: { color: '#fff', fontWeight: '900', fontSize: 20 },
  title: { ...type.h1, color: colors.text, textShadowColor: colors.primary, textShadowRadius: 20 },
  sub: { ...type.body, color: colors.gold, letterSpacing: 2, marginTop: 4 },
  loader: { position: 'absolute', bottom: 80, alignItems: 'center', gap: 12 },
  loaderText: { ...type.caption, color: colors.textDim },
});
