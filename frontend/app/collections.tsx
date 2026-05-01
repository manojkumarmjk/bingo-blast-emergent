import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function Collections() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    try { setData(await api.collection(u.id)); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const claim = async () => {
    if (!user) return;
    try { const r = await api.collectionClaim(user.id); Alert.alert('Set Complete!', `+${r.reward} Bcoins`); await load(); }
    catch (e: any) { Alert.alert('Oops', e.message); }
  };

  if (!data) return <ScreenBg><SafeAreaView /></ScreenBg>;
  const set = data.set;

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="collections-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Collections</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={gradients.prestige as any} style={[styles.hero, shadows.md]}>
          <MaterialCommunityIcons name="cards" size={36} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.setName}>{set.name}</Text>
            <Text style={styles.setDesc}>{set.desc}</Text>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${(data.owned_count / set.balls.length) * 100}%` }]} /></View>
            <Text style={styles.prog}>{data.owned_count} / {set.balls.length} owned</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.grid}>
          {set.balls.map((b: any) => (
            <View key={b.id} style={[styles.ball, !b.owned && { opacity: 0.3 }]}>
              <View style={[styles.ballCircle, { backgroundColor: b.color, borderColor: b.owned ? colors.gold : colors.surfaceHi }]}>
                <Text style={styles.ballNum}>{b.id.split('_')[1]}</Text>
              </View>
              <Text style={styles.ballName}>{b.name}</Text>
              <View style={[styles.rarity, { backgroundColor: b.rarity === 'epic' ? colors.primary : b.rarity === 'rare' ? colors.secondary : colors.surfaceHi }]}>
                <Text style={styles.rarityText}>{b.rarity.toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {data.complete && (
          <TouchableOpacity onPress={claim} style={styles.claimBtn}>
            <LinearGradient colors={gradients.gold as any} style={styles.claimGrad}>
              <MaterialCommunityIcons name="trophy" size={22} color={colors.onGold} />
              <Text style={styles.claimText}>Claim {set.reward} Bcoins</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <Text style={styles.hint}>💡 Spin the Daily Wheel to find Neon Balls!</Text>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  hero: { flexDirection: 'row', gap: 12, alignItems: 'center', margin: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  setName: { ...type.h3, color: '#fff' },
  setDesc: { ...type.caption, color: 'rgba(255,255,255,0.85)' },
  bar: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.3)', overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', backgroundColor: colors.gold },
  prog: { ...type.caption, color: '#fff', marginTop: 4, fontWeight: '700' as const },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: 10 },
  ball: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', backgroundColor: colors.surface, padding: 8, borderRadius: radius.md, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  ballCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  ballNum: { color: '#fff', fontSize: 22, fontWeight: '900' as const },
  ballName: { ...type.caption, color: colors.text, fontSize: 11 },
  rarity: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  rarityText: { ...type.badge, color: '#fff', fontSize: 9 },
  claimBtn: { marginHorizontal: spacing.md, marginVertical: spacing.sm, borderRadius: 999, overflow: 'hidden', ...shadows.glowGold },
  claimGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
  claimText: { ...type.title, color: colors.onGold },
  hint: { color: colors.textDim, textAlign: 'center', padding: spacing.md, fontSize: 12 },
});
