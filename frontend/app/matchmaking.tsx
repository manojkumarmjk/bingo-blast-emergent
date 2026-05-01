import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type, columnColor, columnLetter } from '../src/theme';
import { api, storage } from '../src/api';

export default function Matchmaking() {
  const router = useRouter();
  const [status, setStatus] = useState<'queued' | 'matched' | 'expired'>('queued');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [user, setUser] = useState<any>(null);
  const entryIdRef = useRef<string | null>(null);
  const pollRef = useRef<any>(null);
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1, false);
    (async () => {
      const u = await storage.getUser(); if (!u) return;
      setUser(u);
      try {
        const res = await api.matchmakingJoin(u.id);
        entryIdRef.current = res.entry_id;
        if (res.status === 'matched') return handleMatched(res);
        startPolling(res.entry_id);
      } catch (e: any) {
        Alert.alert('Error', e.message);
        router.back();
      }
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (entryIdRef.current) api.matchmakingCancel(entryIdRef.current).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = (entryId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.matchmakingStatus(entryId);
        if (r.status === 'matched') {
          clearInterval(pollRef.current);
          handleMatched(r);
        } else if (r.status === 'queued') {
          setWaitSeconds(r.wait_seconds || 0);
        } else if (r.status === 'expired') {
          clearInterval(pollRef.current);
          Alert.alert('Queue expired', 'Try again');
          router.back();
        }
      } catch {}
    }, 1000);
  };

  const handleMatched = (r: any) => {
    if (r.match_type === 'bot') {
      // Auto-match with bot after 60s timeout (matches backend MATCHMAKING_BOT_TIMEOUT_SECONDS)
      router.replace({ pathname: '/game', params: { mode: 'computer', numCards: '2' } });
    } else {
      // Real player match — go straight to game with the room
      router.replace({ pathname: '/game', params: { mode: 'multiplayer', roomId: r.room_id } });
    }
  };

  const cancel = async () => {
    if (entryIdRef.current) await api.matchmakingCancel(entryIdRef.current).catch(() => {});
    router.back();
  };

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  const BOT_FALLBACK_SECONDS = 60;
  const remaining = Math.max(0, BOT_FALLBACK_SECONDS - waitSeconds);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const remainingLabel = mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;

  return (
    <ScreenBg>
      <SafeAreaView style={styles.container} testID="matchmaking-screen">
        <Text style={styles.title}>Finding Opponent</Text>
        <Text style={styles.sub}>Searching the global Bingo Blast network...</Text>

        <View style={styles.center}>
          <Animated.View style={[styles.ring, ringStyle]}>
            {[0,1,2,3,4].map(i => (
              <View key={i} style={[styles.ringBall, {
                backgroundColor: columnColor(i),
                transform: [{ rotate: `${i * 72}deg` }, { translateY: -90 }],
              }]}>
                <Text style={styles.ringBallText}>{columnLetter(i)}</Text>
              </View>
            ))}
          </Animated.View>
          <View style={styles.youBadge}>
            <Image source={{ uri: user?.avatar }} style={styles.avatar} />
            <Text style={styles.you}>You</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{status === 'matched' ? 'MATCH FOUND!' : 'WAITING...'}</Text>
          <Text style={styles.timer}>{waitSeconds}s</Text>
          {remaining > 0 ? (
            <Text style={styles.fallback}>Auto-match with Bot in {remainingLabel}</Text>
          ) : (
            <Text style={[styles.fallback, { color: colors.gold }]}>Matching with Bot...</Text>
          )}
        </View>

        <TouchableOpacity onPress={cancel} style={styles.cancelBtn} testID="cancel-mm-btn">
          <MaterialCommunityIcons name="close" size={20} color="#fff" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { ...type.h2, color: colors.text, marginTop: spacing.lg },
  sub: { ...type.body, color: colors.textDim, textAlign: 'center', marginTop: 4 },
  center: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center' },
  ringBall: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ringBallText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  youBadge: { position: 'absolute', alignItems: 'center', gap: 4 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.gold, ...shadows.glowGold },
  you: { ...type.caption, color: colors.gold, fontWeight: '800' as const },
  statusCard: { width: '100%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statusLabel: { ...type.badge, color: colors.gold },
  timer: { fontSize: 48, fontWeight: '900', color: colors.text, lineHeight: 50 },
  fallback: { ...type.caption, color: colors.textDim, marginTop: 4 },
  cancelBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.surfaceHi, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cancelText: { ...type.body, color: '#fff', fontWeight: '700' as const },
});
