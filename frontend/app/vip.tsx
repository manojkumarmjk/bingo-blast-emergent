import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { LoadingState } from '../src/StateViews';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function VIP() {
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    try { setInfo(await api.vipInfo(u.id)); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activate = async (planId: string) => {
    if (!user) return;
    Alert.alert('VIP Activation', 'Razorpay flow would open here. Simulate activation? (mocked)', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate (Mock)', onPress: async () => {
        try { await api.vipActivate(user.id, planId); Alert.alert('VIP Active!', 'Welcome to VIP'); await load(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  if (!info) return <ScreenBg><SafeAreaView style={{ flex: 1 }}><LoadingState message="Loading VIP..." /></SafeAreaView></ScreenBg>;

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="vip-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>VIP Membership</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
          <LinearGradient colors={gradients.gold as any} style={[styles.hero, shadows.glowGold]}>
            <MaterialCommunityIcons name="crown" size={56} color={colors.onGold} />
            <Text style={styles.heroTitle}>{info.active ? 'VIP ACTIVE' : 'GO VIP'}</Text>
            <Text style={styles.heroSub}>{info.active ? `${info.days_left} days remaining` : 'Premium perks for serious players'}</Text>
          </LinearGradient>

          <Text style={styles.section}>VIP Perks</Text>
          {info.perks.map((p: any, i: number) => (
            <View key={i} style={styles.perkRow}>
              <View style={styles.perkIcon}><MaterialCommunityIcons name={p.icon} size={22} color={colors.gold} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkDesc}>{p.desc}</Text>
              </View>
              {info.active && <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />}
            </View>
          ))}

          {!info.active && (
            <>
              <Text style={styles.section}>Choose Your Plan</Text>
              {info.plans.map((p: any) => (
                <TouchableOpacity key={p.id} onPress={() => activate(p.id)} style={[styles.planCard, p.badge && styles.planFeatured]} testID={`vip-plan-${p.id}`}>
                  {p.badge && <View style={styles.featuredBadge}><Text style={styles.featuredText}>{p.badge}</Text></View>}
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.planPrice}>₹{p.price_inr}</Text>
                  <Text style={styles.planDays}>{p.days} days</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  hero: { padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: colors.onGold, letterSpacing: 2, marginTop: 8 },
  heroSub: { ...type.body, color: colors.onGold, opacity: 0.9 },
  section: { ...type.title, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  perkIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  perkTitle: { ...type.body, color: colors.text },
  perkDesc: { ...type.caption, color: colors.textDim },
  planCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: 10, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  planFeatured: { borderColor: colors.gold, ...shadows.glowGold },
  featuredBadge: { position: 'absolute', top: -10, backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  featuredText: { ...type.badge, color: colors.onGold, fontSize: 10 },
  planName: { ...type.title, color: colors.text },
  planPrice: { fontSize: 36, fontWeight: '900', color: colors.gold, marginTop: 4 },
  planDays: { ...type.caption, color: colors.textDim },
});
