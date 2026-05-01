import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';

const MODES = [
  { key: 'computer', title: 'Computer Mode', sub: 'Play vs Bingo Bot • Any time', icon: 'robot', grad: gradients.secondary, players: '1v1', reward: '150 BC', kind: 'computer' },
  { key: 'classic', title: 'Classic', sub: 'Real online multiplayer', icon: 'account-group', grad: gradients.primary, players: 'Up to 25', reward: '500 BC', kind: 'room', room_type: 'free' },
  { key: 'prestige', title: 'Prestige Room', sub: 'Premium entry with bigger prize', icon: 'diamond-stone', grad: gradients.prestige, players: 'Up to 10', reward: '1200 BC', price: '₹25', kind: 'room', room_type: 'prestige' },
  { key: 'luxury', title: 'Luxury Room', sub: 'High-stakes, high-rewards', icon: 'crown', grad: gradients.luxury, players: 'Up to 10', reward: '5000 BC', price: '₹150', kind: 'room', room_type: 'luxury' },
  { key: 'custom', title: 'Custom Room', sub: 'Set your own rules and invite friends', icon: 'cog', grad: gradients.tournament, players: '10 or 25', reward: 'Varies', kind: 'create' },
];

export default function GameModes() {
  const router = useRouter();

  const open = (m: any) => {
    if (m.kind === 'computer') router.push({ pathname: '/game', params: { mode: 'computer' } });
    else if (m.kind === 'create') router.push({ pathname: '/create-room', params: { preset: 'custom' } });
    else router.push({ pathname: '/create-room', params: { preset: m.room_type } });
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="game-mode-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Pick Your Mode</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
          {MODES.map((m) => (
            <TouchableOpacity key={m.key} activeOpacity={0.88} onPress={() => open(m)} style={[styles.card, shadows.md]} testID={`room-card-${m.key}`}>
              <LinearGradient colors={m.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGrad}>
                <View style={styles.cardIcon}><MaterialCommunityIcons name={m.icon as any} size={32} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.cardTitle}>{m.title}</Text>
                    {m.price && <View style={styles.pricePill}><Text style={styles.priceText}>{m.price}</Text></View>}
                  </View>
                  <Text style={styles.cardSub}>{m.sub}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.chip}><MaterialCommunityIcons name="account-multiple" size={12} color="#fff" /><Text style={styles.chipText}>{m.players}</Text></View>
                    <View style={styles.chip}><MaterialCommunityIcons name="trophy" size={12} color={colors.gold} /><Text style={styles.chipText}>{m.reward}</Text></View>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
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
  card: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md },
  cardGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  cardIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...type.h3, color: '#fff' },
  cardSub: { ...type.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { ...type.caption, color: '#fff', fontSize: 11 },
  pricePill: { backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  priceText: { ...type.badge, color: colors.onGold, fontSize: 11 },
});
