import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { LoadingState } from '../src/StateViews';
import { api, storage } from '../src/api';

export default function BattlePass() {
  const router = useRouter();
  const [bp, setBp] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    try { setBp(await api.battlePass(u.id)); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const claim = async (tier: number, track: 'free' | 'premium') => {
    if (!user) return;
    try { await api.bpClaim(user.id, tier, track); await load(); Alert.alert('Claimed!', 'Reward added'); }
    catch (e: any) { Alert.alert('Oops', e.message); }
  };

  const goPremium = async () => {
    if (!user) return;
    Alert.alert('Premium Pass', `Unlock Premium for ₹${bp?.premium_price_inr} via Razorpay?\n(Mocked — simulate activation?)`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: async () => { await api.bpActivatePremium(user.id); await load(); } },
    ]);
  };

  if (!bp) return <ScreenBg><SafeAreaView style={{ flex: 1 }}><LoadingState message="Loading battle pass..." /></SafeAreaView></ScreenBg>;

  const xp = bp.xp || 0;
  const currentTier = bp.tiers.findIndex((t: any) => xp < t.xp_required);
  const activeTier = currentTier < 0 ? bp.tiers.length : currentTier;
  const nextReq = activeTier < bp.tiers.length ? bp.tiers[activeTier].xp_required : xp;
  const prevReq = activeTier > 0 ? bp.tiers[activeTier - 1].xp_required : 0;
  const progressPct = Math.min(100, ((xp - prevReq) / Math.max(1, nextReq - prevReq)) * 100);

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="battle-pass-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Battle Pass</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={gradients.tournament as any} style={[styles.hero, shadows.glowPrimary]}>
          <Text style={styles.season}>{bp.season}</Text>
          <Text style={styles.endsIn}>Ends in {bp.ends_in_days}d</Text>
          <View style={styles.xpBar}><View style={[styles.xpFill, { width: `${progressPct}%` }]} /></View>
          <Text style={styles.xpText}>{xp} XP • Tier {activeTier} / {bp.tiers.length}</Text>
          {!bp.premium && (
            <TouchableOpacity onPress={goPremium} style={styles.premiumBtn}>
              <MaterialCommunityIcons name="crown" size={18} color={colors.onGold} />
              <Text style={styles.premiumText}>Unlock Premium ₹{bp.premium_price_inr}</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.trackLabels}>
          <Text style={styles.trackLabel}>FREE</Text>
          <Text style={[styles.trackLabel, { color: colors.gold }]}>PREMIUM</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
          {bp.tiers.slice(0, 20).map((t: any) => {
            const unlocked = xp >= t.xp_required;
            const freeClaimed = (bp.claimed?.free || []).includes(t.tier);
            const premClaimed = (bp.claimed?.premium || []).includes(t.tier);
            return (
              <View key={t.tier} style={styles.tierRow}>
                <View style={styles.tierBadge}><Text style={styles.tierNum}>{t.tier}</Text></View>
                <RewardSlot reward={t.free} unlocked={unlocked} claimed={freeClaimed} onClaim={() => claim(t.tier, 'free')} />
                <RewardSlot reward={t.premium} unlocked={unlocked && bp.premium} locked={!bp.premium} claimed={premClaimed} onClaim={() => claim(t.tier, 'premium')} premium />
              </View>
            );
          })}
          <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: 10, fontSize: 12 }}>Showing first 20 of 50 tiers. Keep playing to unlock more!</Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

function RewardSlot({ reward, unlocked, claimed, onClaim, premium, locked }: any) {
  const iconMap: any = { bcoins: 'star-four-points', powerup: 'flash', collection: 'cards' };
  const label = reward.type === 'bcoins' ? `${reward.amount} BC` : reward.type === 'powerup' ? `Power-up x${reward.amount || 1}` : 'Neon Ball';
  return (
    <View style={[styles.slot, premium && styles.slotPremium, !unlocked && { opacity: 0.4 }]}>
      <MaterialCommunityIcons name={iconMap[reward.type] || 'gift'} size={24} color={premium ? colors.gold : colors.secondary} />
      <Text style={styles.slotLabel}>{label}</Text>
      {claimed ? <View style={styles.claimedBadge}><MaterialCommunityIcons name="check" size={14} color="#fff" /></View> :
        unlocked && !locked ? (
          <TouchableOpacity onPress={onClaim} style={[styles.slotBtn, premium && { backgroundColor: colors.gold }]}><Text style={[styles.slotBtnText, premium && { color: colors.onGold }]}>Claim</Text></TouchableOpacity>
        ) : locked ? <MaterialCommunityIcons name="lock" size={18} color={colors.textDim} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  hero: { margin: spacing.md, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  season: { ...type.h3, color: '#fff' },
  endsIn: { ...type.caption, color: 'rgba(255,255,255,0.8)' },
  xpBar: { width: '100%', height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.3)', overflow: 'hidden', marginTop: 10 },
  xpFill: { height: '100%', backgroundColor: colors.gold },
  xpText: { ...type.caption, color: '#fff', marginTop: 4 },
  premiumBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginTop: 10 },
  premiumText: { ...type.body, color: colors.onGold, fontWeight: '800' as const },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.md + 50, marginBottom: spacing.xs },
  trackLabel: { ...type.badge, color: colors.textDim },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tierBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tierNum: { ...type.body, color: colors.text, fontWeight: '900' as const },
  slot: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  slotPremium: { borderColor: colors.gold, backgroundColor: colors.gold + '11' },
  slotLabel: { flex: 1, ...type.caption, color: colors.text, fontSize: 12 },
  slotBtn: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  slotBtnText: { ...type.caption, color: '#fff', fontWeight: '800' as const, fontSize: 11 },
  claimedBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
});
