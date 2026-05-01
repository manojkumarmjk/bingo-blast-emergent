import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function Missions() {
  const router = useRouter();
  const [missions, setMissions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    try { const r = await api.missions(u.id); setMissions(r.missions || []); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const claim = async (m: any) => {
    if (!user) return;
    try {
      const res = await api.claimMission(user.id, m.id);
      Alert.alert('Claimed!', `+${res.reward} Bcoins`);
      await load();
    } catch (e: any) { Alert.alert('Oops', e.message); }
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="missions-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Daily Missions</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={gradients.primary as any} style={[styles.summary, shadows.glowPrimary]}>
          <MaterialCommunityIcons name="calendar-check" size={36} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sumTop}>Resets at midnight UTC</Text>
            <Text style={styles.sumBig}>Complete all 3 for bonus!</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {missions.map((m: any) => {
            const progress = Math.min(m.progress || 0, m.target);
            const pct = (progress / m.target) * 100;
            const done = progress >= m.target;
            return (
              <View key={m.id} style={[styles.card, shadows.md]}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name={m.icon || 'flag-checkered'} size={26} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mTitle}>{m.title}</Text>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: done ? colors.gold : colors.primary }]} /></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={styles.progress}>{progress} / {m.target}</Text>
                    <Text style={styles.reward}>+{m.reward} BC</Text>
                  </View>
                </View>
                <TouchableOpacity
                  disabled={!done || m.claimed}
                  onPress={() => claim(m)}
                  style={[styles.claimBtn, (!done || m.claimed) && { opacity: 0.4 }]}>
                  <Text style={styles.claimText}>{m.claimed ? '✓' : done ? 'Claim' : 'Go'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  sumTop: { ...type.caption, color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  sumBig: { ...type.title, color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  mTitle: { ...type.body, color: colors.text },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceHi, overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%' },
  progress: { ...type.caption, color: colors.textDim, fontSize: 11 },
  reward: { ...type.caption, color: colors.gold, fontSize: 11, fontWeight: '800' as const },
  claimBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  claimText: { ...type.caption, color: '#fff', fontWeight: '800' as const },
});
