import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl, Image, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import ScreenBg from '../../src/ScreenBg';
import HeaderBar from '../../src/HeaderBar';
import { colors, gradients, radius, shadows, spacing, type } from '../../src/theme';
import { api, storage } from '../../src/api';

const FILTERS = [
  { key: 'all', label: 'All', icon: 'view-grid' },
  { key: 'free', label: 'Free', icon: 'gift-outline' },
  { key: 'paid', label: 'Paid', icon: 'diamond-stone' },
  { key: 'tournament', label: 'Events', icon: 'trophy' },
];

export default function Rooms() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>(params.filter || 'all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const u = await storage.getUser(); setUser(u);
    try {
      const r = await api.listRooms(filter === 'all' ? undefined : filter);
      setRooms(r);
    } catch (e: any) { console.warn(e.message); }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const join = async (room: any) => {
    if (!user) return;
    try {
      await api.joinRoom(room.id, user.id);
      router.push({ pathname: '/waiting-room', params: { roomId: room.id } });
    } catch (e: any) { Alert.alert('Cannot join', e.message); }
  };

  const roomTypeBadge = (t: string) => {
    const map: any = {
      free: { label: 'FREE', color: colors.secondary, grad: gradients.free },
      prestige: { label: 'PRESTIGE', color: colors.primary, grad: gradients.prestige },
      luxury: { label: 'LUXURY', color: colors.gold, grad: gradients.luxury },
      custom: { label: 'CUSTOM', color: colors.textDim, grad: gradients.secondary },
      tournament: { label: 'TOURNAMENT', color: colors.primary, grad: gradients.tournament },
    };
    return map[t] || map.custom;
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="lobby-screen">
        <HeaderBar user={user} testIDPrefix="rooms" />

        <View style={styles.titleRow}>
          <Text style={styles.title}>Rooms</Text>
          <Text style={styles.subtitle}>{rooms.length} live</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              testID={`filter-${f.key}`}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}>
              <MaterialCommunityIcons name={f.icon as any} size={14} color={filter === f.key ? '#fff' : colors.textDim} />
              <Text style={[styles.filterText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {rooms.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="door-closed" size={64} color={colors.textMute} />
            <Text style={styles.emptyTitle}>No rooms yet</Text>
            <Text style={styles.emptySub}>Be the first — create a room and invite friends!</Text>
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(r) => r.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
            renderItem={({ item }) => {
              const badge = roomTypeBadge(item.room_type);
              return (
                <View style={[styles.roomCard, shadows.md]}>
                  <LinearGradient colors={badge.grad} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge.label}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{item.name}</Text>
                    <Text style={styles.roomMeta}>
                      <MaterialCommunityIcons name="account-multiple" size={12} color={colors.textDim} /> {item.players.length}/{item.max_players}
                      {'  •  '}
                      <MaterialCommunityIcons name="star-four-points" size={12} color={colors.gold} /> Prize {item.prize}
                    </Text>
                    <Text style={styles.roomCode}>Code: <Text style={{ color: colors.gold }}>{item.code}</Text></Text>
                  </View>
                  <TouchableOpacity onPress={() => join(item)} style={styles.joinBtn} testID="room-join-btn">
                    <LinearGradient colors={gradients.primary as any} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={styles.joinGrad}>
                      <Text style={styles.joinText}>{item.entry_fee > 0 ? `Join ${item.entry_fee}BC` : 'Join'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}

        <TouchableOpacity onPress={() => router.push('/game-modes')} style={[styles.fab, shadows.glowPrimary]} testID="create-room-fab">
          <LinearGradient colors={gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            <Text style={styles.fabText}>Create</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginTop: 4 },
  title: { ...type.h2, color: colors.text },
  subtitle: { ...type.caption, color: colors.gold },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...type.caption, color: colors.textDim, fontWeight: '700' as const },
  roomCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { ...type.badge, color: '#fff', fontSize: 9 },
  roomName: { ...type.bodyL, color: colors.text },
  roomMeta: { ...type.caption, color: colors.textDim, marginTop: 2 },
  roomCode: { ...type.caption, color: colors.textMute, marginTop: 2 },
  joinBtn: { borderRadius: 999, overflow: 'hidden' },
  joinGrad: { paddingHorizontal: 18, paddingVertical: 12 },
  joinText: { ...type.body, color: '#fff', fontWeight: '700' as const },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: 8 },
  emptyTitle: { ...type.title, color: colors.text },
  emptySub: { ...type.caption, color: colors.textDim, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, borderRadius: 999 },
  fabGrad: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999 },
  fabText: { ...type.body, color: '#fff', fontWeight: '800' as const },
});
