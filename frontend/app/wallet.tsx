import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function Wallet() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const stored = await storage.getUser();
    if (!stored?.id) return;
    const [u, t] = await Promise.all([api.getUser(stored.id).catch(() => stored), api.transactions(stored.id).catch(() => [])]);
    setUser(u); setTxs(t);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const earned = txs.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
  const spent = txs.filter((t) => t.amount < 0).reduce((a, b) => a + b.amount, 0);

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="wallet-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
          <LinearGradient colors={gradients.gold as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.balanceCard, shadows.glowGold]}>
            <Text style={styles.balLabel}>CURRENT BALANCE</Text>
            <View style={styles.balRow}>
              <MaterialCommunityIcons name="star-four-points" size={40} color={colors.onGold} />
              <Text style={styles.balVal}>{user?.bcoins || 0}</Text>
            </View>
            <Text style={styles.balSub}>Bcoins</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/shop')} style={styles.topup}>
              <Text style={styles.topupText}>+ Add Bcoins</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: colors.success }]}>
              <MaterialCommunityIcons name="trending-up" size={20} color={colors.success} />
              <Text style={styles.statNum}>+{earned}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={[styles.statBox, { borderColor: colors.error }]}>
              <MaterialCommunityIcons name="trending-down" size={20} color={colors.error} />
              <Text style={styles.statNum}>{spent}</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Transaction History</Text>
          {txs.length === 0 && <Text style={{ color: colors.textDim, textAlign: 'center', padding: spacing.md }}>No transactions yet.</Text>}
          {txs.map((t) => (
            <View key={t.id} style={styles.txRow} testID="tx-row">
              <View style={[styles.txIcon, { backgroundColor: t.amount > 0 ? 'rgba(6,214,160,0.2)' : 'rgba(239,71,111,0.2)' }]}>
                <MaterialCommunityIcons name={t.amount > 0 ? 'plus' : 'minus'} size={22} color={t.amount > 0 ? colors.success : colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{t.description}</Text>
                <Text style={styles.txDate}>{new Date(t.created_at).toLocaleString()}</Text>
              </View>
              <Text style={[styles.txAmt, { color: t.amount > 0 ? colors.success : colors.error }]}>
                {t.amount > 0 ? '+' : ''}{t.amount}
              </Text>
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
  balanceCard: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  balLabel: { ...type.badge, color: colors.onGold, opacity: 0.8 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  balVal: { fontSize: 56, fontWeight: '900', color: colors.onGold },
  balSub: { ...type.body, color: colors.onGold, opacity: 0.8 },
  topup: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  topupText: { ...type.body, color: '#fff', fontWeight: '800' as const },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  statNum: { ...type.h3, color: colors.text },
  statLabel: { ...type.caption, color: colors.textDim },
  sectionTitle: { ...type.title, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txDesc: { ...type.body, color: colors.text },
  txDate: { ...type.caption, color: colors.textDim, fontSize: 11 },
  txAmt: { ...type.bodyL, fontWeight: '800' as const },
});
