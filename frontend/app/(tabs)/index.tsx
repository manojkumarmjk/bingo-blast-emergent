import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import ScreenBg from '../../src/ScreenBg';
import HeaderBar from '../../src/HeaderBar';
import { colors, gradients, radius, shadows, spacing, type, media, columnColor, columnLetter } from '../../src/theme';
import { api, storage } from '../../src/api';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyClaimable, setDailyClaimable] = useState(true);

  const loadUser = useCallback(async () => {
    const stored = await storage.getUser();
    if (!stored?.id) { router.replace('/login'); return; }
    try {
      const fresh = await api.getUser(stored.id);
      await storage.setUser(fresh);
      setUser(fresh);
      if (fresh.last_daily_claim) {
        const last = new Date(fresh.last_daily_claim).getTime();
        setDailyClaimable(Date.now() - last > 20 * 3600 * 1000);
      } else { setDailyClaimable(true); }
    } catch { setUser(stored); }
  }, [router]);

  useFocusEffect(useCallback(() => { loadUser(); }, [loadUser]));

  const onRefresh = async () => { setRefreshing(true); await loadUser(); setRefreshing(false); };

  const claimDaily = async () => {
    if (!user || !dailyClaimable) return;
    try {
      const res = await api.claimDaily(user.id);
      Alert.alert('Daily Reward!', `You got +${res.reward} Bcoins!`);
      await loadUser();
    } catch (e: any) { Alert.alert('Oops', e.message); }
  };

  if (!user) return <ScreenBg><SafeAreaView /></ScreenBg>;

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="home-dashboard">
        <HeaderBar user={user} />
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: spacing.xl }}>

          {/* Daily Reward */}
          <TouchableOpacity activeOpacity={0.9} disabled={!dailyClaimable} onPress={claimDaily} style={[styles.dailyCard, shadows.glowGold]} testID="daily-reward-card">
            <LinearGradient colors={gradients.gold as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dailyGrad}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dailyLabel}>DAILY REWARD</Text>
                <Text style={styles.dailyTitle}>{dailyClaimable ? 'Claim Now!' : 'Come back tomorrow'}</Text>
                <Text style={styles.dailySub}>Tap to grab 50-200 Bcoins</Text>
              </View>
              <Image source={{ uri: media.coins }} style={styles.dailyImg} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Play Modes Grid */}
          <Text style={styles.sectionTitle}>Play Now</Text>
          <View style={styles.grid}>
            <ModeCard testID="play-computer-btn" label="Computer" sub="vs Bot • Solo" icon="robot" grad={gradients.secondary} onPress={() => router.push({ pathname: '/game', params: { mode: 'computer' } })} />
            <ModeCard testID="play-multiplayer-btn" label="Classic" sub="Multiplayer • Free" icon="account-group" grad={gradients.primary} onPress={() => router.push('/(tabs)/rooms')} />
            <ModeCard testID="play-free-btn" label="Free Room" sub="Quick • No Cost" icon="gift-outline" grad={gradients.free} onPress={() => router.push({ pathname: '/(tabs)/rooms', params: { filter: 'free' } })} />
            <ModeCard testID="play-paid-btn" label="Paid Room" sub="Prestige • ₹25+" icon="diamond-stone" grad={gradients.prestige} onPress={() => router.push({ pathname: '/(tabs)/rooms', params: { filter: 'paid' } })} />
          </View>

          {/* Quick Actions */}
          <View style={styles.quickRow}>
            <QuickAction label="Spin Wheel" icon="ferris-wheel" onPress={() => router.push('/spin-wheel')} testID="quick-spin" />
            <QuickAction label="Tournaments" icon="trophy" onPress={() => router.push('/tournaments')} testID="quick-tournaments" />
            <QuickAction label="Friends" icon="account-multiple" onPress={() => router.push('/friends')} testID="quick-friends" />
            <QuickAction label="Shop" icon="cart" onPress={() => router.push('/(tabs)/shop')} testID="quick-shop" />
          </View>

          {/* Tournament Banner */}
          <TouchableOpacity onPress={() => router.push('/tournaments')} style={styles.tournBanner} testID="tournament-banner" activeOpacity={0.9}>
            <LinearGradient colors={gradients.tournament as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tournGrad}>
              <Image source={{ uri: media.tournament }} style={styles.tournImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tournTag}>LIVE EVENT</Text>
                <Text style={styles.tournTitle}>Weekend Blast</Text>
                <Text style={styles.tournSub}>Prize Pool ₹25,000 • 512 slots</Text>
                <View style={styles.tournBtn}><Text style={styles.tournBtnText}>Join →</Text></View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bingo Strip preview */}
          <View style={styles.stripCard}>
            <View style={styles.stripHeader}>
              <Text style={styles.sectionTitle}>Quick Stats</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.viewAll}>View all →</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Stat icon="trophy" value={user.wins} label="Wins" color={colors.gold} />
              <Stat icon="gamepad-variant" value={user.matches} label="Games" color={colors.secondary} />
              <Stat icon="fire" value={user.streak} label="Streak" color={colors.primary} />
            </View>
            <View style={styles.bingoStripInner}>
              {[0,1,2,3,4].map(i => (
                <View key={i} style={[styles.miniBall, { backgroundColor: columnColor(i) }]}>
                  <Text style={styles.miniBallText}>{columnLetter(i)}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

function ModeCard({ label, sub, icon, grad, onPress, testID }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.modeCard, shadows.md]} testID={testID}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modeGrad}>
        <MaterialCommunityIcons name={icon} size={36} color="#fff" />
        <Text style={styles.modeLabel}>{label}</Text>
        <Text style={styles.modeSub}>{sub}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function QuickAction({ label, icon, onPress, testID }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickBtn} activeOpacity={0.8} testID={testID}>
      <View style={styles.quickIcon}><MaterialCommunityIcons name={icon} size={22} color={colors.gold} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ icon, value, label, color }: any) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dailyCard: { marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radius.lg, overflow: 'hidden' },
  dailyGrad: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 12 },
  dailyLabel: { ...type.badge, color: colors.onGold, opacity: 0.7 },
  dailyTitle: { ...type.h3, color: colors.onGold, marginTop: 2 },
  dailySub: { ...type.caption, color: colors.onGold, opacity: 0.8 },
  dailyImg: { width: 80, height: 80, resizeMode: 'contain' },
  sectionTitle: { ...type.title, color: colors.text, marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: 12 },
  modeCard: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 1.15 },
  modeGrad: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  modeLabel: { ...type.title, color: '#fff', marginTop: 'auto' },
  modeSub: { ...type.caption, color: '#fff', opacity: 0.85 },
  quickRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: 10, marginTop: spacing.md },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  quickIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  quickLabel: { ...type.caption, color: colors.textDim, fontSize: 12 },
  tournBanner: { marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden', ...shadows.md },
  tournGrad: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 12 },
  tournImg: { width: 80, height: 80, resizeMode: 'contain' },
  tournTag: { ...type.badge, color: colors.gold, fontSize: 10 },
  tournTitle: { ...type.h3, color: '#fff', marginTop: 2 },
  tournSub: { ...type.caption, color: 'rgba(255,255,255,0.85)' },
  tournBtn: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tournBtnText: { ...type.caption, color: '#fff', fontWeight: '700' as const },
  stripCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  stripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { ...type.caption, color: colors.secondary, marginRight: spacing.md },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceHi, padding: spacing.md, borderRadius: radius.md, gap: 4 },
  statValue: { ...type.h3, color: '#fff' },
  statLabel: { ...type.caption, color: colors.textDim, fontSize: 11 },
  bingoStripInner: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  miniBall: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  miniBallText: { color: '#fff', fontWeight: '900' as const },
});
