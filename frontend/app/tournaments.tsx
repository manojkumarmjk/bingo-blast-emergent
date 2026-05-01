import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type, media } from '../src/theme';
import { api, storage } from '../src/api';

export default function Tournaments() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tab, setTab] = useState<'ongoing' | 'upcoming'>('ongoing');

  const load = useCallback(async () => {
    try { setTournaments(await api.tournaments()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const register = async (t: any) => {
    const u = await storage.getUser(); if (!u) return;
    try {
      await api.registerTournament(u.id, t.id);
      Alert.alert('Registered!', `You are in ${t.name}. Check back when it starts.`);
    } catch (e: any) { Alert.alert('Cannot register', e.message); }
  };

  const filtered = tournaments.filter((t) => t.status === tab);

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="tournament-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Tournaments</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabs}>
          {(['ongoing', 'upcoming'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && { color: '#fff' }]}>{t === 'ongoing' ? 'Ongoing' : 'Upcoming'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
          {filtered.length === 0 && (
            <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: spacing.xl }}>No {tab} tournaments.</Text>
          )}
          {filtered.map((t) => (
            <View key={t.id} style={[styles.card, shadows.md]} testID="tournament-card">
              <LinearGradient colors={gradients.tournament as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGrad}>
                <Image source={{ uri: media.tournament }} style={styles.cardImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{t.name}</Text>
                  <Text style={styles.cardDesc}>{t.desc}</Text>
                  <View style={styles.meta}>
                    <View style={styles.chip}><MaterialCommunityIcons name="ticket" size={12} color={colors.gold} /><Text style={styles.chipText}>₹{t.entry_fee}</Text></View>
                    <View style={styles.chip}><MaterialCommunityIcons name="trophy" size={12} color={colors.gold} /><Text style={styles.chipText}>₹{t.prize_pool.toLocaleString()}</Text></View>
                    <View style={styles.chip}><MaterialCommunityIcons name="account-multiple" size={12} color="#fff" /><Text style={styles.chipText}>{t.players}/{t.max_players}</Text></View>
                  </View>
                </View>
              </LinearGradient>
              <View style={styles.footer}>
                <View>
                  <Text style={styles.timerLabel}>{t.status === 'ongoing' ? 'ENDS IN' : 'STARTS IN'}</Text>
                  <Text style={styles.timer}>{t.starts_in_hours}h</Text>
                </View>
                <TouchableOpacity onPress={() => register(t)} style={styles.regBtn} testID="register-tournament-btn">
                  <LinearGradient colors={gradients.gold as any} style={styles.regGrad}>
                    <Text style={styles.regText}>{t.status === 'ongoing' ? 'Join Now' : 'Register'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.md },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...type.caption, color: colors.textDim, fontWeight: '700' as const },
  card: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md },
  cardGrad: { flexDirection: 'row', padding: spacing.md, gap: 12 },
  cardImg: { width: 80, height: 80, resizeMode: 'contain' },
  cardTitle: { ...type.h3, color: '#fff' },
  cardDesc: { ...type.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  chipText: { ...type.caption, color: '#fff', fontSize: 11 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface },
  timerLabel: { ...type.badge, color: colors.textDim, fontSize: 10 },
  timer: { ...type.h3, color: colors.gold },
  regBtn: { borderRadius: 999, overflow: 'hidden' },
  regGrad: { paddingHorizontal: 20, paddingVertical: 12 },
  regText: { ...type.body, color: colors.onGold, fontWeight: '800' as const },
});
