import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../../src/ScreenBg';
import HeaderBar from '../../src/HeaderBar';
import { colors, gradients, radius, shadows, spacing, type } from '../../src/theme';
import { LoadingState } from '../../src/StateViews';
import { api, storage } from '../../src/api';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);

  const load = useCallback(async () => {
    const stored = await storage.getUser();
    if (!stored?.id) return;
    try {
      const [u, a] = await Promise.all([api.getUser(stored.id), api.achievements(stored.id)]);
      setUser(u); setAchievements(a);
      await storage.setUser(u);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await storage.clearUser();
        router.replace('/login');
      }},
    ]);
  };

  if (!user) return <ScreenBg><SafeAreaView style={{ flex: 1 }}><LoadingState message="Loading profile..." /></SafeAreaView></ScreenBg>;
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="profile-screen">
        <HeaderBar user={user} testIDPrefix="profile" />
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient colors={gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroRing}>
              <Image source={{ uri: user.avatar }} style={styles.heroAvatar} />
            </LinearGradient>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.tagline}>Level {user.level} • Friend Code: {user.friend_code || user.id?.slice(0,8).toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity onPress={() => router.push('/settings')} style={styles.editBtn} testID="edit-profile-btn">
                <MaterialCommunityIcons name="cog" size={18} color={colors.text} />
                <Text style={styles.editText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/friends')} style={styles.editBtn}>
                <MaterialCommunityIcons name="account-multiple" size={18} color={colors.text} />
                <Text style={styles.editText}>Friends</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid} testID="stats-grid">
            <StatCard icon="trophy" value={user.wins} label="Wins" color={colors.gold} />
            <StatCard icon="gamepad-variant" value={user.matches} label="Matches" color={colors.secondary} />
            <StatCard icon="fire" value={user.streak} label="Streak" color={colors.primary} />
            <StatCard icon="star-four-points" value={user.bcoins} label="Bcoins" color={colors.gold} />
          </View>

          {/* Achievements */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <TouchableOpacity onPress={() => router.push('/achievements')}>
              <Text style={styles.viewAll}>{unlocked}/{achievements.length} →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 10 }}>
            {achievements.map((a) => (
              <View key={a.id} style={[styles.achievBadge, !a.unlocked && { opacity: 0.4 }]}>
                <MaterialCommunityIcons name={a.unlocked ? 'check-decagram' : 'lock'} size={28} color={a.unlocked ? colors.gold : colors.textDim} />
                <Text style={styles.achievName}>{a.name}</Text>
                <Text style={styles.achievDesc}>{a.desc}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Menu */}
          <View style={styles.menu}>
            <MenuItem icon="crown" label="VIP Membership" onPress={() => router.push('/vip')} />
            <MenuItem icon="palette" label="Customize Avatar" onPress={() => router.push('/avatar-customize')} />
            <MenuItem icon="shield-account" label="Guilds" onPress={() => router.push('/guilds')} />
            <MenuItem icon="wallet" label="Wallet" onPress={() => router.push('/wallet')} />
            <MenuItem icon="trophy-award" label="Tournaments" onPress={() => router.push('/tournaments')} />
            <MenuItem icon="ferris-wheel" label="Daily Spin" onPress={() => router.push('/spin-wheel')} />
            <MenuItem icon="help-circle" label="Help & Support" onPress={() => Alert.alert('Help', 'Email support@bingoblast.app')} />
            <MenuItem icon="logout" label="Logout" onPress={logout} danger />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

function StatCard({ icon, value, label, color }: any) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuRow} activeOpacity={0.7}>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? colors.error : colors.text} />
      <Text style={[styles.menuText, danger && { color: colors.error }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textDim} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: spacing.md, paddingHorizontal: spacing.md },
  heroRing: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', padding: 4 },
  heroAvatar: { width: 112, height: 112, borderRadius: 56 },
  username: { ...type.h2, color: colors.text, marginTop: 10 },
  tagline: { ...type.caption, color: colors.textDim, marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  editText: { ...type.caption, color: colors.text, fontWeight: '700' as const },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: 10 },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statValue: { ...type.h3, color: colors.text },
  statLabel: { ...type.caption, color: colors.textDim },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { ...type.title, color: colors.text },
  viewAll: { ...type.caption, color: colors.secondary },
  achievBadge: { width: 120, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  achievName: { ...type.caption, color: colors.text, fontWeight: '700' as const, textAlign: 'center' },
  achievDesc: { ...type.caption, color: colors.textDim, fontSize: 10, textAlign: 'center' },
  menu: { marginHorizontal: spacing.md, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  menuText: { ...type.body, color: colors.text, flex: 1 },
});
