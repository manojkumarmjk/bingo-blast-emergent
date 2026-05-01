import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { LoadingState } from '../src/StateViews';
import { api, storage } from '../src/api';

export default function StreakCalendar() {
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    try { setInfo(await api.streak(u.id)); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const claim = async () => {
    if (!user) return;
    try { const r = await api.claimDaily(user.id); Alert.alert('Daily Reward!', `+${r.reward} Bcoins • Day ${r.streak_days} streak`); await load(); }
    catch (e: any) { Alert.alert('Oops', e.message); }
  };

  if (!info) return <ScreenBg><SafeAreaView style={{ flex: 1 }}><LoadingState message="Loading streak..." /></SafeAreaView></ScreenBg>;
  const streakDays = info.streak_days || 0;
  const canClaim = !info.last_daily_claim || (Date.now() - new Date(info.last_daily_claim).getTime() > 20 * 3600 * 1000);

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="streak-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Daily Streak</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <LinearGradient colors={gradients.gold as any} style={[styles.hero, shadows.glowGold]}>
            <MaterialCommunityIcons name="fire" size={48} color={colors.onGold} />
            <Text style={styles.streakNum}>{streakDays}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </LinearGradient>

          <Text style={styles.section}>7-Day Login Rewards</Text>
          <View style={styles.calendar}>
            {info.rewards.map((reward: number, i: number) => {
              const day = i + 1;
              const passed = day <= streakDays;
              const today = day === streakDays;
              return (
                <View key={day} style={[styles.dayCard, passed && styles.dayCardPassed, today && canClaim && styles.dayCardToday]}>
                  <Text style={[styles.dayLabel, passed && { color: '#fff' }]}>DAY {day}</Text>
                  <MaterialCommunityIcons name={passed ? 'check-circle' : 'star-four-points'} size={28} color={passed ? colors.success : colors.gold} />
                  <Text style={[styles.dayReward, passed && { color: colors.gold }]}>{reward} BC</Text>
                  {today && canClaim && <Text style={styles.todayBadge}>TODAY</Text>}
                  {day === 7 && <MaterialCommunityIcons name="crown" size={14} color={colors.gold} style={{ position: 'absolute', top: 4, right: 4 }} />}
                </View>
              );
            })}
          </View>

          <GradientButton
            label={canClaim ? `Claim Day ${Math.min(7, streakDays + 1)} Reward!` : 'Come back tomorrow'}
            variant="gold"
            onPress={claim}
            disabled={!canClaim}
            size="lg"
            style={{ marginTop: spacing.lg }}
            icon={<MaterialCommunityIcons name="gift" size={22} color={colors.onGold} />}
          />

          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="information" size={20} color={colors.secondary} />
            <Text style={styles.tipText}>Miss a day → streak resets. Come back every day for bigger rewards!</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  hero: { alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg },
  streakNum: { fontSize: 60, fontWeight: '900', color: colors.onGold, lineHeight: 60 },
  streakLabel: { ...type.body, color: colors.onGold, letterSpacing: 2 },
  section: { ...type.title, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCard: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 4, position: 'relative' },
  dayCardPassed: { backgroundColor: colors.success + '33', borderColor: colors.success },
  dayCardToday: { borderColor: colors.gold, borderWidth: 2, ...shadows.glowGold },
  dayLabel: { ...type.badge, color: colors.textDim, fontSize: 10 },
  dayReward: { ...type.body, color: colors.text, fontWeight: '800' as const },
  todayBadge: { position: 'absolute', top: -8, backgroundColor: colors.gold, color: colors.onGold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '900' as const, fontSize: 10 },
  tipCard: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: spacing.md, backgroundColor: colors.surfaceHi, borderRadius: radius.md, marginTop: spacing.md },
  tipText: { flex: 1, ...type.caption, color: colors.textDim },
});
