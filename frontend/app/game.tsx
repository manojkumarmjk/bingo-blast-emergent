import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring, Easing, FadeIn, ZoomIn } from 'react-native-reanimated';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type, columnColor, columnLetter } from '../src/theme';
import { api, storage, WS_URL } from '../src/api';

const EMOTES = ['🎉', '👏', '🔥', '😎', '💪', '🎯', '👑', '🍀'];

export default function Game() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; roomId?: string }>();
  const mode = params.mode === 'multiplayer' ? 'multiplayer' : 'computer';
  const [user, setUser] = useState<any>(null);
  const [card, setCard] = useState<(number | null)[][] | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ userId: string; emote: string; ts: number }[]>([]);
  const [showCallAnim, setShowCallAnim] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const callerTimerRef = useRef<any>(null);
  const ballScale = useSharedValue(0);

  // --------- COMPUTER mode ----------
  const initComputer = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    const match = await api.createComputerMatch(u.id);
    setMatchId(match.id);
    setCard(match.user_card);
    setPlayers([
      { user_id: u.id, username: u.username, avatar: u.avatar, is_me: true },
      { user_id: 'bot', username: match.bot_name, avatar: match.bot_avatar, is_bot: true },
    ]);
    setLoading(false);
    callerTimerRef.current = setInterval(callNext, 3000);
  }, []);

  const callNext = async () => {
    setMatchId((mid) => {
      if (!mid) return mid;
      api.callNumber(mid).then((m: any) => {
        setCalledNumbers(m.called_numbers);
        const last = m.called_numbers[m.called_numbers.length - 1];
        if (last != null) triggerCallAnim(last);
        if (m.status === 'finished') {
          clearInterval(callerTimerRef.current);
          if (m.winner === 'bot') {
            setTimeout(() => router.replace({ pathname: '/win', params: { winner: 'bot', prize: '0' } }), 1600);
          }
        }
      }).catch(() => {});
      return mid;
    });
  };

  // --------- MULTIPLAYER mode ----------
  const initMultiplayer = useCallback(async () => {
    const u = await storage.getUser(); if (!u || !params.roomId) return; setUser(u);
    setRoomId(params.roomId);
    const ws = new WebSocket(WS_URL(params.roomId, u.id));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'room_state' || msg.type === 'game_started') {
          const r = msg.room;
          setPlayers(r.players);
          const myCard = r.cards?.[u.id];
          if (myCard) setCard(myCard);
          setCalledNumbers(r.called_numbers || []);
          setLoading(false);
        } else if (msg.type === 'number_called') {
          setCalledNumbers(msg.called_numbers);
          triggerCallAnim(msg.number);
        } else if (msg.type === 'bingo_winner') {
          setFinished(true);
          const amIWinner = msg.winner_id === u.id;
          setTimeout(() => router.replace({ pathname: '/win', params: { winner: amIWinner ? 'user' : 'other', prize: String(msg.prize) } }), 1400);
        } else if (msg.type === 'invalid_bingo') {
          Alert.alert('Not Bingo yet', 'Your card does not have a bingo. Careful claims!');
        } else if (msg.type === 'emote') {
          setChatMessages((prev) => [...prev.slice(-3), { userId: msg.user_id, emote: msg.emote, ts: Date.now() }]);
        }
      } catch {}
    };
    wsRef.current = ws;
  }, [params.roomId, router]);

  useEffect(() => {
    if (mode === 'computer') initComputer();
    else initMultiplayer();
    return () => {
      if (callerTimerRef.current) clearInterval(callerTimerRef.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerCallAnim = (num: number) => {
    setCurrentCall(num);
    setShowCallAnim(true);
    ballScale.value = 0;
    ballScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 120 }),
      withTiming(1, { duration: 200 }),
    );
    setTimeout(() => setShowCallAnim(false), 1400);
  };

  const claimBingo = async () => {
    if (mode === 'computer' && matchId && user) {
      try {
        const res = await api.claimBingo(matchId, user.id);
        if (res.valid) {
          clearInterval(callerTimerRef.current);
          router.replace({ pathname: '/win', params: { winner: 'user', prize: String(res.reward) } });
        } else {
          Alert.alert('Invalid Bingo!', 'You lose this match for a wrong claim.');
          router.replace({ pathname: '/win', params: { winner: 'bot', prize: '0' } });
        }
      } catch (e: any) { Alert.alert('Error', e.message); }
    } else if (mode === 'multiplayer') {
      wsRef.current?.send(JSON.stringify({ type: 'claim_bingo' }));
    }
  };

  const sendEmote = (emote: string) => {
    if (mode === 'multiplayer') {
      wsRef.current?.send(JSON.stringify({ type: 'emote', emote }));
    }
    setChatMessages((prev) => [...prev.slice(-3), { userId: user?.id, emote, ts: Date.now() }]);
    setShowChat(false);
  };

  const callSet = new Set(calledNumbers);
  const ballStyle = useAnimatedStyle(() => ({ transform: [{ scale: ballScale.value }] }));
  const lastFive = calledNumbers.slice(-5).reverse();

  if (loading || !card) {
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="refresh" size={40} color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 10 }}>Preparing your card...</Text>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  const colFor = (n: number | null) => {
    if (n == null) return 2;
    if (n <= 15) return 0;
    if (n <= 30) return 1;
    if (n <= 45) return 2;
    if (n <= 60) return 3;
    return 4;
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="game-screen">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.hint}>Current Call</Text>
            {currentCall != null ? (
              <View style={[styles.currentBall, { backgroundColor: columnColor(colFor(currentCall)) }]}>
                <Text style={styles.currentLetter}>{columnLetter(colFor(currentCall))}</Text>
                <Text style={styles.currentNum}>{currentCall}</Text>
              </View>
            ) : (
              <Text style={styles.hint}>Waiting...</Text>
            )}
          </View>
          <View style={styles.prizeBox}>
            <MaterialCommunityIcons name="trophy" size={16} color={colors.gold} />
            <Text style={styles.prizeText}>{mode === 'computer' ? '150 BC' : 'Prize'}</Text>
          </View>
        </View>

        {/* Recent numbers strip */}
        <View style={styles.recentStrip} testID="recent-numbers-strip">
          <Text style={styles.recentLabel}>Recent:</Text>
          {lastFive.length === 0 ? (
            <Text style={styles.recentEmpty}>No numbers called yet</Text>
          ) : lastFive.map((n, idx) => (
            <View key={`${n}-${idx}`} style={[styles.miniBall, { backgroundColor: columnColor(colFor(n)), opacity: 1 - idx * 0.15 }]}>
              <Text style={styles.miniBallText}>{n}</Text>
            </View>
          ))}
        </View>

        {/* Board */}
        <View style={styles.board} testID="bingo-board-grid">
          {/* Header B-I-N-G-O */}
          <View style={styles.headerRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.headerCell, { backgroundColor: columnColor(i) }]}>
                <Text style={styles.headerText}>{columnLetter(i)}</Text>
              </View>
            ))}
          </View>
          {card.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cell, c) => {
                const isFree = cell == null;
                const marked = isFree || (cell != null && callSet.has(cell));
                return (
                  <View key={c} style={[styles.cell, marked && styles.cellMarked]} testID={`bingo-cell-${r}-${c}`}>
                    {marked && !isFree && (
                      <View style={styles.markDot}>
                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                      </View>
                    )}
                    <Text style={[styles.cellText, marked && !isFree && { color: colors.bg }]}>
                      {isFree ? 'FREE' : cell}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Players compact */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playersRow}>
          {players.slice(0, 8).map((p) => (
            <View key={p.user_id} style={styles.playerPill}>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerInitials}>{(p.username || '?').slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName} numberOfLines={1}>{p.username}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Emote floating messages */}
        <View style={styles.floatingEmotes} pointerEvents="none">
          {chatMessages.slice(-3).map((m) => (
            <Animated.Text key={m.ts} entering={FadeIn} style={styles.floatingEmote}>{m.emote}</Animated.Text>
          ))}
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={() => setShowChat(true)} style={styles.chatBtn} testID="chat-overlay-btn">
            <MaterialCommunityIcons name="emoticon-happy" size={26} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={claimBingo} style={[styles.bingoBtn, shadows.glowGold]} testID="claim-bingo-btn" activeOpacity={0.85}>
            <LinearGradient colors={gradients.gold as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bingoGrad}>
              <MaterialCommunityIcons name="trophy" size={22} color={colors.onGold} />
              <Text style={styles.bingoText}>BINGO!</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Leave', 'Leave the game?', [
            { text: 'Stay', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => router.back() },
          ])} style={styles.chatBtn}>
            <MaterialCommunityIcons name="flag" size={26} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Number Called Animation Overlay */}
        {showCallAnim && currentCall != null && (
          <View style={styles.overlay} pointerEvents="none">
            <Animated.View style={[styles.bigBall, { backgroundColor: columnColor(colFor(currentCall)) }, ballStyle]} entering={ZoomIn}>
              <Text style={styles.bigLetter}>{columnLetter(colFor(currentCall))}</Text>
              <Text style={styles.bigNum}>{currentCall}</Text>
            </Animated.View>
          </View>
        )}

        {/* Chat / Emote Modal */}
        <Modal visible={showChat} transparent animationType="slide" onRequestClose={() => setShowChat(false)}>
          <TouchableOpacity style={styles.chatBackdrop} activeOpacity={1} onPress={() => setShowChat(false)}>
            <View style={styles.chatSheet}>
              <Text style={styles.chatTitle}>Quick Emotes</Text>
              <View style={styles.emoteGrid}>
                {EMOTES.map((e) => (
                  <TouchableOpacity key={e} onPress={() => sendEmote(e)} style={styles.emoteBtn}>
                    <Text style={styles.emoteText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.presetRow}>
                {['GG', 'Nice!', 'Good luck', 'BINGO soon!'].map((m) => (
                  <TouchableOpacity key={m} onPress={() => sendEmote(m)} style={styles.presetBtn}>
                    <Text style={styles.presetText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, paddingHorizontal: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  hint: { ...type.caption, color: colors.textDim, fontSize: 10 },
  currentBall: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  currentLetter: { color: '#fff', fontWeight: '900', fontSize: 12 },
  currentNum: { color: '#fff', fontWeight: '900', fontSize: 20, lineHeight: 22 },
  prizeBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  prizeText: { ...type.caption, color: colors.text, fontWeight: '800' as const, fontSize: 11 },
  recentStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  recentLabel: { ...type.caption, color: colors.textDim, fontSize: 11 },
  recentEmpty: { ...type.caption, color: colors.textMute, fontSize: 11 },
  miniBall: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  miniBallText: { color: '#fff', fontWeight: '800' as const, fontSize: 12 },
  board: { paddingHorizontal: spacing.md, marginTop: spacing.xs },
  headerRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  headerCell: { flex: 1, aspectRatio: 1.8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerText: { color: '#fff', fontWeight: '900', fontSize: 22 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  cell: {
    flex: 1, aspectRatio: 1, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cellMarked: { backgroundColor: '#fff' },
  cellText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  markDot: { position: 'absolute', top: 3, right: 3, backgroundColor: colors.primary, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  playersRow: { gap: 8, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  playerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderRadius: 999 },
  playerAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  playerInitials: { color: '#fff', fontWeight: '900', fontSize: 11 },
  playerName: { ...type.caption, color: colors.text, fontSize: 12, maxWidth: 80 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, gap: 10 },
  chatBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  bingoBtn: { flex: 1, height: 64, borderRadius: 999, overflow: 'hidden' },
  bingoGrad: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  bingoText: { color: colors.onGold, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  bigBall: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', ...shadows.glowPrimary },
  bigLetter: { color: '#fff', fontSize: 44, fontWeight: '900' },
  bigNum: { color: '#fff', fontSize: 80, fontWeight: '900', lineHeight: 88 },
  floatingEmotes: { position: 'absolute', right: 20, top: 200, alignItems: 'center', gap: 8 },
  floatingEmote: { fontSize: 32 },
  chatBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  chatSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatTitle: { ...type.title, color: colors.text, textAlign: 'center' },
  emoteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  emoteBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  emoteText: { fontSize: 28 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceHi, borderRadius: 999 },
  presetText: { ...type.caption, color: colors.text, fontWeight: '700' as const },
});
