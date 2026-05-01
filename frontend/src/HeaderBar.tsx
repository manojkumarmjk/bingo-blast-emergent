import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients, radius, shadows, type } from './theme';
import { useRouter } from 'expo-router';

interface Props {
  user: any;
  onPressAvatar?: () => void;
  onPressBalance?: () => void;
  testIDPrefix?: string;
}

export default function HeaderBar({ user, onPressAvatar, onPressBalance, testIDPrefix = 'home' }: Props) {
  const router = useRouter();
  if (!user) return null;
  return (
    <View style={styles.container} testID={`${testIDPrefix}-header`}>
      <TouchableOpacity
        onPress={onPressAvatar || (() => router.push('/(tabs)/profile'))}
        style={styles.userBlock}
        activeOpacity={0.8}
        testID="user-avatar-btn">
        <View style={styles.avatarWrap}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{user.level || 1}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.hiText}>Hi, Player</Text>
          <Text style={styles.username} numberOfLines={1}>{user.username}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onPressBalance || (() => router.push('/wallet'))}
        activeOpacity={0.85}
        testID="wallet-balance-display">
        <LinearGradient
          colors={gradients.gold as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.coinPill, shadows.glowGold]}>
          <MaterialCommunityIcons name="star-four-points" size={18} color={colors.onGold} />
          <Text style={styles.coinText}>{user.bcoins}</Text>
          <View style={styles.plusBtn}>
            <MaterialCommunityIcons name="plus" size={14} color={colors.onGold} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  userBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.primary },
  levelBadge: {
    position: 'absolute', right: -4, bottom: -4,
    backgroundColor: colors.gold, width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg,
  },
  levelText: { ...type.badge, color: colors.onGold, fontSize: 10 },
  hiText: { ...type.caption, color: colors.textDim },
  username: { ...type.bodyL, color: colors.text, maxWidth: 140 },
  coinPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
  },
  coinText: { ...type.body, color: colors.onGold, fontWeight: '800' as const },
  plusBtn: { backgroundColor: 'rgba(0,0,0,0.15)', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});
