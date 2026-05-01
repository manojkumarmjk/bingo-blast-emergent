import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../../src/ScreenBg';
import HeaderBar from '../../src/HeaderBar';
import { colors, gradients, radius, shadows, spacing, type } from '../../src/theme';
import { api, storage } from '../../src/api';

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all', label: 'All Time' },
];

export default function Leaderboard() {
  const [user, setUser] = useState<any>(null);
  const [period, setPeriod] = useState('all');
  const [data, setData] = useState<any[]>([]);

  const load = useCallback(async () => {
    const u = await storage.getUser(); setUser(u);
    try {
      const res = await api.leaderboard(period);
      setData(res.leaderboard || []);
    } catch {}
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myRank = data.find((p) => p.user_id === user?.id);
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  const [second, first, third] = [top3[1], top3[0], top3[2]];

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="leaderboard-screen">
        <HeaderBar user={user} testIDPrefix="leaderboard" />
        <Text style={styles.title}>Leaderboard</Text>

        <View style={styles.tabs}>
          {PERIODS.map((p) => (
            <TouchableOpacity key={p.key} onPress={() => setPeriod(p.key)} style={[styles.tab, period === p.key && styles.tabActive]} testID={`tab-${p.key}`}>
              <Text style={[styles.tabText, period === p.key && { color: '#fff' }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Podium */}
          <View style={styles.podium}>
            {second && <PodiumCol player={second} rank={2} height={100} color={colors.secondary} testID="podium-2nd" />}
            {first && <PodiumCol player={first} rank={1} height={140} color={colors.gold} testID="podium-1st" />}
            {third && <PodiumCol player={third} rank={3} height={80} color={colors.primary} testID="podium-3rd" />}
          </View>

          {/* List */}
          {rest.map((p) => (
            <View key={p.user_id} style={styles.row}>
              <Text style={styles.rank}>{p.rank}</Text>
              <Image source={{ uri: p.avatar }} style={styles.rowAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.username}</Text>
                <Text style={styles.rowSub}>Level {p.level}</Text>
              </View>
              <View style={styles.winsBox}>
                <MaterialCommunityIcons name="trophy" size={16} color={colors.gold} />
                <Text style={styles.winsText}>{p.wins}</Text>
              </View>
            </View>
          ))}

          {data.length === 0 && (
            <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: spacing.xl }}>No data yet — play matches to rank up!</Text>
          )}
        </ScrollView>

        {myRank && (
          <View style={[styles.sticky, shadows.md]} testID="user-sticky-rank">
            <LinearGradient colors={gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stickyGrad}>
              <Text style={styles.stickyRank}>#{myRank.rank}</Text>
              <Image source={{ uri: myRank.avatar }} style={styles.stickyAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stickyName}>You • {myRank.username}</Text>
                <Text style={styles.stickySub}>{myRank.wins} wins • Lvl {myRank.level}</Text>
              </View>
              <MaterialCommunityIcons name="fire" size={22} color={colors.gold} />
            </LinearGradient>
          </View>
        )}
      </SafeAreaView>
    </ScreenBg>
  );
}

function PodiumCol({ player, rank, height, color, testID }: any) {
  return (
    <View style={styles.podCol} testID={testID}>
      {rank === 1 && <MaterialCommunityIcons name="crown" size={28} color={colors.gold} />}
      <Image source={{ uri: player.avatar }} style={[styles.podAvatar, { borderColor: color }]} />
      <Text style={styles.podName} numberOfLines={1}>{player.username}</Text>
      <Text style={[styles.podWins, { color }]}>🏆 {player.wins}</Text>
      <LinearGradient colors={[color, color] as any} style={[styles.podBar, { height }]}>
        <Text style={styles.podRank}>{rank}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.text, paddingHorizontal: spacing.md },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: 8, marginTop: spacing.sm },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...type.caption, color: colors.textDim, fontWeight: '700' as const },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: spacing.md, marginTop: spacing.md },
  podCol: { alignItems: 'center', flex: 1 },
  podAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, marginTop: 4 },
  podName: { ...type.caption, color: colors.text, marginTop: 4, maxWidth: 100 },
  podWins: { ...type.caption, fontSize: 12 },
  podBar: { width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, marginTop: 6 },
  podRank: { ...type.h2, color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginHorizontal: spacing.md, marginBottom: 6 },
  rank: { ...type.title, color: colors.textDim, width: 32 },
  rowAvatar: { width: 40, height: 40, borderRadius: 20 },
  rowName: { ...type.body, color: colors.text },
  rowSub: { ...type.caption, color: colors.textDim },
  winsBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceHi, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  winsText: { ...type.caption, color: colors.text, fontWeight: '700' as const },
  sticky: { position: 'absolute', bottom: 0, left: spacing.md, right: spacing.md, marginBottom: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
  stickyGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  stickyRank: { ...type.h3, color: '#fff' },
  stickyAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff' },
  stickyName: { ...type.body, color: '#fff' },
  stickySub: { ...type.caption, color: 'rgba(255,255,255,0.85)' },
});
