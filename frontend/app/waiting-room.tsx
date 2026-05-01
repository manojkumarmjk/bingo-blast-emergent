import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage, WS_URL } from '../src/api';

export default function WaitingRoom() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(async () => {
    const u = await storage.getUser();
    if (!u || !roomId) return;
    setUser(u);
    try { setRoom(await api.getRoom(roomId)); } catch {}
    const ws = new WebSocket(WS_URL(roomId, u.id));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'room_state' || msg.type === 'player_joined') setRoom(msg.room);
        if (msg.type === 'game_started') {
          router.replace({ pathname: '/game', params: { mode: 'multiplayer', roomId } });
        }
      } catch {}
    };
    ws.onerror = () => {};
    wsRef.current = ws;
  }, [roomId, router]);

  useFocusEffect(useCallback(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]));

  const toggleReady = () => {
    const me = room?.players.find((p: any) => p.user_id === user?.id);
    wsRef.current?.send(JSON.stringify({ type: 'ready', ready: !me?.ready }));
  };

  const startGame = () => {
    setCountdown(3);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); wsRef.current?.send(JSON.stringify({ type: 'start' })); return 0; }
        return c - 1;
      });
    }, 800);
  };

  if (!room || !user) return <ScreenBg><SafeAreaView /></ScreenBg>;
  const isHost = room.host_id === user.id;
  const me = room.players.find((p: any) => p.user_id === user.id);

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="waiting-room-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { wsRef.current?.close(); router.back(); }} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>{room.name}</Text>
            <Text style={styles.sub}>Code: {room.code}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: '/invite-friends', params: { roomId } })} style={styles.backBtn}>
            <MaterialCommunityIcons name="share-variant" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <View style={styles.infoPill}>
            <MaterialCommunityIcons name="account-multiple" size={16} color={colors.gold} />
            <Text style={styles.infoPillText}>{room.players.length}/{room.max_players}</Text>
          </View>
          <View style={styles.infoPill}>
            <MaterialCommunityIcons name="trophy" size={16} color={colors.gold} />
            <Text style={styles.infoPillText}>{room.prize} BC Prize</Text>
          </View>
          <View style={styles.infoPill}>
            <MaterialCommunityIcons name="ticket" size={16} color={colors.gold} />
            <Text style={styles.infoPillText}>{room.entry_fee > 0 ? `${room.entry_fee} BC` : 'Free'}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.grid} testID="player-avatar-grid">
          {room.players.map((p: any, i: number) => (
            <View key={p.user_id} style={[styles.playerCard, p.ready && styles.playerReady]}>
              <Image source={{ uri: p.avatar }} style={styles.avatar} />
              {p.is_host && <MaterialCommunityIcons name="crown" size={16} color={colors.gold} style={styles.host} />}
              <Text style={styles.pName} numberOfLines={1}>{p.username}</Text>
              <View style={[styles.statusDot, { backgroundColor: p.ready ? colors.success : colors.textMute }]} />
              <Text style={styles.pStatus}>{p.ready ? 'Ready' : 'Waiting'}</Text>
            </View>
          ))}
          {[...Array(Math.max(0, room.max_players - room.players.length))].slice(0, 5).map((_, i) => (
            <View key={`e${i}`} style={[styles.playerCard, { opacity: 0.4 }]}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialCommunityIcons name="account-question" size={32} color={colors.textMute} />
              </View>
              <Text style={styles.pName}>Waiting...</Text>
            </View>
          ))}
        </ScrollView>

        {countdown > 0 && (
          <View style={styles.countdownWrap}>
            <View style={styles.countdownBox}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <GradientButton
            label={me?.ready ? 'Not Ready' : 'Ready Up'}
            variant={me?.ready ? 'secondary' : 'gold'}
            onPress={toggleReady}
            testID="ready-toggle-btn"
            style={{ flex: 1 }}
            icon={<MaterialCommunityIcons name={me?.ready ? 'close' : 'check'} size={18} color={me?.ready ? colors.primary : colors.onGold} />}
          />
          {isHost && (
            <GradientButton
              label="Start Game"
              onPress={startGame}
              testID="start-game-btn"
              style={{ flex: 1 }}
              disabled={room.players.length < 1}
              icon={<MaterialCommunityIcons name="play" size={18} color="#fff" />}
            />
          )}
        </View>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.gold },
  info: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing.sm },
  infoPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  infoPillText: { ...type.caption, color: colors.text, fontSize: 12, fontWeight: '700' as const },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: 10 },
  playerCard: { width: '30%', backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  playerReady: { borderColor: colors.success },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  host: { position: 'absolute', top: 4, right: 4 },
  pName: { ...type.caption, color: colors.text, maxWidth: 80 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  pStatus: { ...type.caption, color: colors.textDim, fontSize: 10 },
  countdownWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.modalOverlay, alignItems: 'center', justifyContent: 'center' },
  countdownBox: { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.glowPrimary },
  countdownText: { fontSize: 80, fontWeight: '900', color: '#fff' },
  footer: { flexDirection: 'row', gap: 10, padding: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
});
