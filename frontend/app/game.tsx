import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type, columnColor, columnLetter } from '../src/theme';
import { api, storage, WS_URL } from '../src/api';

const EMOTES = ['🎉','👏','🔥','😎','💪','🎯','👑','🍀'];
const { width } = Dimensions.get('window');

type Card = (number | null)[][];

const colFor = (n: number | null) => {
  if (n == null) return 2;
  if (n <= 15) return 0;
  if (n <= 30) return 1;
  if (n <= 45) return 2;
  if (n <= 60) return 3;
  return 4;
};

export default function Game() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; roomId?: string; numCards?: string }>();
  const mode = params.mode === 'multiplayer' ? 'multiplayer' : 'computer';
  const requestedCards = mode === 'computer' ? Math.min(4, Math.max(1, parseInt(params.numCards || '2', 10) || 2)) : 1;

  const [user, setUser] = useState<any>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [dabbed, setDabbed] = useState<Set<number>[]>([]); // per card
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [callTime, setCallTime] = useState<number>(0);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCallAnim, setShowCallAnim] = useState(false);
  const [floatText, setFloatText] = useState<{ id: number; text: string; color: string }[]>([]);
  const [peek, setPeek] = useState<number[]>([]);
  const [autoDabsRemaining, setAutoDabsRemaining] = useState(0);
  const [powerups, setPowerups] = useState({ dauber: 0, reveal: 0, double: 0 });
  const [doubleActive, setDoubleActive] = useState(false);
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [winningCardIdx, setWinningCardIdx] = useState<number | null>(null);
  const [wrongTapCell, setWrongTapCell] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const callerTimerRef = useRef<any>(null);
  const ballScale = useSharedValue(0);
  const floatIdRef = useRef(0);

  // ---------- How-to-play first time ----------
  useEffect(() => {
    (async () => {
      const flag = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('bingo_howto_seen'));
      if (!flag) setShowHowTo(true);
    })();
  }, []);
  const dismissHowTo = async () => {
    setShowHowTo(false);
    const AS = (await import('@react-native-async-storage/async-storage')).default;
    await AS.setItem('bingo_howto_seen', '1');
  };

  // ---------- Init ----------
  const initComputer = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return;
    setUser(u);
    setPowerups(u.powerups || { dauber: 2, reveal: 2, double: 1 });
    try {
      const match = await api.createComputerMatch(u.id, 'medium', requestedCards);
      setMatchId(match.id);
      const uc = match.user_cards || (match.user_card ? [match.user_card] : []);
      setCards(uc);
      setDabbed(uc.map(() => new Set<number>()));
      setPlayers([
        { user_id: u.id, username: u.username, avatar: u.avatar, is_me: true },
        { user_id: 'bot', username: match.bot_name, avatar: match.bot_avatar, is_bot: true },
      ]);
      setLoading(false);
      callerTimerRef.current = setInterval(callNextComputer, 3500);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedCards]);

  const callNextComputer = useCallback(async () => {
    setMatchId((mid) => {
      if (!mid) return mid;
      api.callNumber(mid).then((m: any) => {
        setCalledNumbers(m.called_numbers);
        const last = m.called_numbers[m.called_numbers.length - 1];
        if (last != null) triggerCallAnim(last);
        if (m.status === 'finished' && m.winner === 'bot') {
          clearInterval(callerTimerRef.current);
          setTimeout(() => router.replace({ pathname: '/win', params: { winner: 'bot', prize: '0' } }), 1600);
        }
      }).catch(() => {});
      return mid;
    });
  }, [router]);

  const initMultiplayer = useCallback(async () => {
    const u = await storage.getUser(); if (!u || !params.roomId) return;
    setUser(u);
    setPowerups(u.powerups || { dauber: 2, reveal: 2, double: 1 });
    const ws = new WebSocket(WS_URL(params.roomId, u.id));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'room_state' || msg.type === 'game_started') {
          const r = msg.room;
          setPlayers(r.players || []);
          const myCard = r.cards?.[u.id];
          if (myCard) { setCards([myCard]); setDabbed([new Set<number>()]); }
          setCalledNumbers(r.called_numbers || []);
          setLoading(false);
        } else if (msg.type === 'number_called') {
          setCalledNumbers(msg.called_numbers);
          triggerCallAnim(msg.number);
        } else if (msg.type === 'bingo_winner') {
          const amIWinner = msg.winner_id === u.id;
          setTimeout(() => router.replace({ pathname: '/win', params: { winner: amIWinner ? 'user' : 'other', prize: String(msg.prize) } }), 1400);
        } else if (msg.type === 'invalid_bingo') {
          Alert.alert('Not yet!', 'Your marked cells don\'t form a line.');
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

  // ---------- Call anim + auto-dab ----------
  const triggerCallAnim = (num: number) => {
    setCurrentCall(num);
    setCallTime(Date.now());
    setShowCallAnim(true);
    ballScale.value = 0;
    ballScale.value = withSequence(
      withSpring(1.15, { damping: 9, stiffness: 140 }),
      withTiming(1, { duration: 180 }),
    );
    setTimeout(() => setShowCallAnim(false), 1200);
    // Auto-dauber: auto-mark if user has active dauber
    if (autoDabsRemaining > 0) {
      setTimeout(() => {
        autoDabOnAnyCard(num);
        setAutoDabsRemaining((r) => Math.max(0, r - 1));
        showFloat('AUTO ✨', colors.secondary);
      }, 350);
    }
  };

  const autoDabOnAnyCard = (num: number) => {
    setCards((cs) => {
      setDabbed((dd) => {
        const next = dd.map(s => new Set(s));
        cs.forEach((card, ci) => {
          card.forEach(row => row.forEach(cell => {
            if (cell === num) next[ci].add(num);
          }));
        });
        return next;
      });
      return cs;
    });
  };

  // ---------- Manual dab ----------
  const onDab = async (cardIdx: number, r: number, c: number) => {
    const cell = cards[cardIdx]?.[r]?.[c];
    if (cell == null) return; // free center
    if (!calledNumbers.includes(cell)) {
      // wrong tap - shake feedback
      setWrongTapCell(`${cardIdx}-${r}-${c}`);
      setTimeout(() => setWrongTapCell(null), 400);
      showFloat('Not called', colors.error);
      return;
    }
    if (dabbed[cardIdx]?.has(cell)) return; // already
    setDabbed((dd) => {
      const next = dd.map(s => new Set(s));
      next[cardIdx].add(cell);
      return next;
    });
    // Speed bonus: dab within 1.5s of call
    const isSpeed = cell === currentCall && Date.now() - callTime < 1500;
    showFloat(isSpeed ? 'QUICK! +2XP' : '+1XP', isSpeed ? colors.gold : colors.success);
    // Track server-side
    if (mode === 'computer' && user) {
      api.dabNumber(matchId!, user.id, cell, isSpeed).catch(() => {});
    }
  };

  const showFloat = (text: string, color: string) => {
    const id = ++floatIdRef.current;
    setFloatText((f) => [...f, { id, text, color }]);
    setTimeout(() => setFloatText((f) => f.filter(x => x.id !== id)), 900);
  };

  // ---------- Power-ups ----------
  const usePowerup = async (pid: 'dauber' | 'reveal' | 'double') => {
    if (powerups[pid] <= 0) { Alert.alert('No power-ups', 'Get more from the Shop!'); return; }
    if (!matchId || !user) return;
    try {
      const res = await api.usePowerup(matchId, user.id, pid);
      setPowerups((p) => ({ ...p, [pid]: p[pid] - 1 }));
      const eff = res.effect || {};
      if (pid === 'reveal' && eff.peek) { setPeek(eff.peek); showFloat(`Peek next ${eff.peek.length}`, colors.secondary); setTimeout(() => setPeek([]), 6000); }
      if (pid === 'dauber') { setAutoDabsRemaining((r) => r + 3); showFloat('Auto-dab x3', colors.info); }
      if (pid === 'double') { setDoubleActive(true); showFloat('2x REWARD!', colors.gold); }
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  // ---------- Claim bingo ----------
  const tryClaimBingo = async (cardIdx = activeCardIdx) => {
    const d = dabbed[cardIdx];
    const card = cards[cardIdx];
    if (!card || !d) return;
    // Client-side validate for UX
    if (!hasLine(card, d)) { Alert.alert('Not yet!', 'Complete a full row, column, or diagonal — and DAB each number before claiming.'); return; }
    setWinningCardIdx(cardIdx);
    if (mode === 'computer' && matchId && user) {
      try {
        const res = await api.claimBingo(matchId, user.id, Array.from(d), cardIdx);
        if (res.valid) {
          clearInterval(callerTimerRef.current);
          router.replace({ pathname: '/win', params: { winner: 'user', prize: String(res.reward) } });
        } else { Alert.alert('Invalid claim!', res.message || 'Wrong claim — match lost.'); router.replace({ pathname: '/win', params: { winner: 'bot', prize: '0' } }); }
      } catch (e: any) { Alert.alert('Error', e.message); }
    } else if (mode === 'multiplayer') {
      wsRef.current?.send(JSON.stringify({ type: 'claim_bingo', dabbed_numbers: Array.from(d) }));
    }
  };

  // ---------- Helpers ----------
  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);

  const hasLine = (card: Card, d: Set<number>): boolean => {
    const m = (v: number | null) => v == null || d.has(v);
    for (let r = 0; r < 5; r++) if ([0,1,2,3,4].every(c => m(card[r][c]))) return true;
    for (let c = 0; c < 5; c++) if ([0,1,2,3,4].every(r => m(card[r][c]))) return true;
    if ([0,1,2,3,4].every(i => m(card[i][i]))) return true;
    if ([0,1,2,3,4].every(i => m(card[i][4-i]))) return true;
    return false;
  };

  const nearBingoCount = (card: Card, d: Set<number>): number => {
    const m = (v: number | null) => v == null || d.has(v);
    const lines: (number | null)[][] = [];
    for (let r = 0; r < 5; r++) lines.push([card[r][0],card[r][1],card[r][2],card[r][3],card[r][4]]);
    for (let c = 0; c < 5; c++) lines.push([card[0][c],card[1][c],card[2][c],card[3][c],card[4][c]]);
    lines.push([card[0][0],card[1][1],card[2][2],card[3][3],card[4][4]]);
    lines.push([card[0][4],card[1][3],card[2][2],card[3][1],card[4][0]]);
    return lines.reduce((acc, ln) => acc + (ln.filter(v => !m(v)).length === 1 ? 1 : 0), 0);
  };

  const canClaim = (ci: number) => cards[ci] && dabbed[ci] && hasLine(cards[ci], dabbed[ci]);
  const anyCanClaim = cards.some((_, i) => canClaim(i));

  const ballStyle = useAnimatedStyle(() => ({ transform: [{ scale: ballScale.value }] }));
  const lastFive = calledNumbers.slice(-5).reverse();

  if (loading) {
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="cards-outline" size={48} color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 10, ...type.body }}>Shuffling cards...</Text>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="game-screen">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="close-game-btn">
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.hint}>Current Call</Text>
            {currentCall != null ? (
              <View style={[styles.currentBall, { backgroundColor: columnColor(colFor(currentCall)) }]}>
                <Text style={styles.currentLetter}>{columnLetter(colFor(currentCall))}</Text>
                <Text style={styles.currentNum}>{currentCall}</Text>
              </View>
            ) : <Text style={styles.hint}>Waiting...</Text>}
          </View>
          <TouchableOpacity onPress={() => setShowHowTo(true)} style={styles.iconBtn} testID="help-btn">
            <MaterialCommunityIcons name="help-circle" size={22} color={colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Recent strip */}
        <View style={styles.recentStrip} testID="recent-numbers-strip">
          <Text style={styles.recentLabel}>Recent:</Text>
          {lastFive.length === 0 ? (
            <Text style={styles.recentEmpty}>Tap cells as they're called!</Text>
          ) : lastFive.map((n, i) => (
            <View key={`${n}-${i}`} style={[styles.miniBall, { backgroundColor: columnColor(colFor(n)), opacity: 1 - i * 0.15 }]}>
              <Text style={styles.miniBallText}>{n}</Text>
            </View>
          ))}
          {peek.length > 0 && (
            <View style={styles.peekBox}>
              <MaterialCommunityIcons name="eye" size={14} color={colors.secondary} />
              <Text style={styles.peekText}>Next: {peek.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Cards */}
        <ScrollView
          horizontal={cards.length > 1}
          pagingEnabled={cards.length > 1}
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => setActiveCardIdx(Math.round(e.nativeEvent.contentOffset.x / (width - 16)))}
          scrollEventThrottle={16}
          contentContainerStyle={{ gap: 8, paddingHorizontal: cards.length > 1 ? 8 : 0 }}>
          {cards.map((card, ci) => {
            const d = dabbed[ci] || new Set<number>();
            const near = nearBingoCount(card, d);
            const lineReady = hasLine(card, d);
            return (
              <View key={ci} style={[styles.boardWrap, cards.length > 1 && { width: width - 16 }]}>
                {cards.length > 1 && (
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>Card {ci + 1} / {cards.length}</Text>
                    {near > 0 && !lineReady && (
                      <View style={[styles.nearPill, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}>
                        <MaterialCommunityIcons name="fire" size={14} color={colors.warning} />
                        <Text style={[styles.nearText, { color: colors.warning }]}>1 away on {near}!</Text>
                      </View>
                    )}
                    {lineReady && (
                      <View style={[styles.nearPill, { backgroundColor: colors.gold + '22', borderColor: colors.gold }]}>
                        <MaterialCommunityIcons name="trophy" size={14} color={colors.gold} />
                        <Text style={[styles.nearText, { color: colors.gold }]}>BINGO READY!</Text>
                      </View>
                    )}
                  </View>
                )}
                <View style={[styles.board, lineReady && styles.boardReady]} testID={`bingo-board-${ci}`}>
                  <View style={styles.headerRow}>
                    {[0,1,2,3,4].map(i => (
                      <View key={i} style={[styles.headerCell, { backgroundColor: columnColor(i) }]}>
                        <Text style={styles.headerText}>{columnLetter(i)}</Text>
                      </View>
                    ))}
                  </View>
                  {card.map((row, r) => (
                    <View key={r} style={styles.row}>
                      {row.map((cell, c) => {
                        const isFree = cell == null;
                        const isDabbed = isFree || (cell != null && d.has(cell));
                        const isCalled = cell != null && calledSet.has(cell);
                        const cellId = `${ci}-${r}-${c}`;
                        const isWrong = wrongTapCell === cellId;
                        return (
                          <Pressable
                            key={c}
                            onPress={() => !isFree && onDab(ci, r, c)}
                            style={[
                              styles.cell,
                              isDabbed && styles.cellDabbed,
                              isCalled && !isDabbed && styles.cellCalled,
                              isWrong && styles.cellWrong,
                            ]}
                            testID={`bingo-cell-${ci}-${r}-${c}`}>
                            {isDabbed && !isFree && (
                              <View style={styles.markDot}>
                                <MaterialCommunityIcons name="check" size={16} color="#fff" />
                              </View>
                            )}
                            <Text style={[styles.cellText, isDabbed && !isFree && { color: colors.bg }, isFree && { fontSize: 12 }]}>
                              {isFree ? 'FREE' : cell}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Card pager dots */}
        {cards.length > 1 && (
          <View style={styles.pagerDots}>
            {cards.map((_, i) => (
              <View key={i} style={[styles.pagerDot, activeCardIdx === i && styles.pagerDotActive]} />
            ))}
          </View>
        )}

        {/* Power-ups bar */}
        <View style={styles.powerBar}>
          <PowerBtn icon="flash" label="Dauber" count={powerups.dauber} active={autoDabsRemaining > 0} onPress={() => usePowerup('dauber')} testID="power-dauber" />
          <PowerBtn icon="eye" label="Reveal" count={powerups.reveal} active={peek.length > 0} onPress={() => usePowerup('reveal')} testID="power-reveal" />
          <PowerBtn icon="trophy" label="2x" count={powerups.double} active={doubleActive} onPress={() => usePowerup('double')} testID="power-double" />
        </View>

        {/* Floating XP texts */}
        <View style={styles.floatingZone} pointerEvents="none">
          {floatText.map(f => (
            <Animated.Text key={f.id} entering={FadeIn} exiting={FadeOut} style={[styles.floatText, { color: f.color }]}>{f.text}</Animated.Text>
          ))}
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={() => setShowChat(true)} style={styles.iconBtn} testID="chat-overlay-btn">
            <MaterialCommunityIcons name="emoticon-happy" size={26} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => tryClaimBingo()} style={[styles.bingoBtn, !anyCanClaim && styles.bingoBtnDisabled]} testID="claim-bingo-btn" activeOpacity={0.85}>
            <LinearGradient colors={anyCanClaim ? gradients.gold as any : ['#635682','#443669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bingoGrad}>
              <MaterialCommunityIcons name="trophy" size={22} color={anyCanClaim ? colors.onGold : colors.textDim} />
              <Text style={[styles.bingoText, !anyCanClaim && { color: colors.textDim }]}>{anyCanClaim ? 'BINGO!' : 'Mark a line'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Leave?', 'You will lose this round.', [
            { text: 'Stay', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => router.back() },
          ])} style={styles.iconBtn}>
            <MaterialCommunityIcons name="flag" size={26} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Call animation overlay */}
        {showCallAnim && currentCall != null && (
          <View style={styles.overlay} pointerEvents="none">
            <Animated.View style={[styles.bigBall, { backgroundColor: columnColor(colFor(currentCall)) }, ballStyle]} entering={ZoomIn}>
              <Text style={styles.bigLetter}>{columnLetter(colFor(currentCall))}</Text>
              <Text style={styles.bigNum}>{currentCall}</Text>
            </Animated.View>
            <Text style={styles.callTip}>Tap {currentCall} on your card — fast for bonus XP!</Text>
          </View>
        )}

        {/* Chat/Emote sheet */}
        <Modal visible={showChat} transparent animationType="slide" onRequestClose={() => setShowChat(false)}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowChat(false)}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Quick Emotes</Text>
              <View style={styles.emoteGrid}>
                {EMOTES.map(e => (
                  <TouchableOpacity key={e} onPress={() => { wsRef.current?.send(JSON.stringify({ type:'emote', emote:e })); setShowChat(false); }} style={styles.emoteBtn}>
                    <Text style={styles.emoteText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* How-to-play modal */}
        <Modal visible={showHowTo} transparent animationType="fade" onRequestClose={dismissHowTo}>
          <View style={styles.modalBg}>
            <View style={styles.howToCard}>
              <Text style={styles.howToTitle}>🎯 How to play</Text>
              <HowToRow icon="gesture-tap" text="A number is called every 3-4 seconds. TAP that number on your card to DAB it." />
              <HowToRow icon="flash" text="Dab within 1.5s → +2 XP speed bonus 🔥" />
              <HowToRow icon="trophy" text="Complete any row, column, or diagonal (center is FREE) → tap BINGO!" />
              <HowToRow icon="eye" text="Power-ups: Dauber auto-marks next 3, Reveal peeks next 3 numbers, 2x doubles the reward." />
              <HowToRow icon="cards" text="Play up to 4 cards at once in Computer mode for bigger rewards!" />
              <TouchableOpacity onPress={dismissHowTo} style={styles.howToBtn} testID="howto-close-btn">
                <LinearGradient colors={gradients.gold as any} style={{ paddingVertical: 14, alignItems: 'center', borderRadius: 999 }}>
                  <Text style={{ color: colors.onGold, fontWeight: '900', fontSize: 16 }}>Got it, let's play!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBg>
  );
}

function PowerBtn({ icon, label, count, active, onPress, testID }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.powerBtn, active && styles.powerBtnActive, count <= 0 && { opacity: 0.4 }]} testID={testID}>
      <MaterialCommunityIcons name={icon} size={20} color={active ? colors.gold : colors.text} />
      <Text style={styles.powerLabel}>{label}</Text>
      <View style={styles.powerCount}><Text style={styles.powerCountText}>x{count}</Text></View>
    </TouchableOpacity>
  );
}

function HowToRow({ icon, text }: any) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.gold} />
      <Text style={{ flex: 1, color: colors.text, lineHeight: 20, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  hint: { ...type.caption, color: colors.textDim, fontSize: 10 },
  currentBall: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  currentLetter: { color: '#fff', fontWeight: '900', fontSize: 11 },
  currentNum: { color: '#fff', fontWeight: '900', fontSize: 20, lineHeight: 22 },
  recentStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexWrap: 'wrap' },
  recentLabel: { ...type.caption, color: colors.textDim, fontSize: 11 },
  recentEmpty: { ...type.caption, color: colors.textMute, fontSize: 11, flex: 1 },
  miniBall: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  miniBallText: { color: '#fff', fontWeight: '800' as const, fontSize: 11 },
  peekBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondary + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.secondary },
  peekText: { ...type.caption, color: colors.secondary, fontSize: 10, fontWeight: '700' as const },
  boardWrap: { paddingHorizontal: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  cardHeaderText: { ...type.caption, color: colors.textDim, fontWeight: '800' as const },
  nearPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  nearText: { ...type.caption, fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.5 },
  board: { padding: 4, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  boardReady: { borderColor: colors.gold, ...shadows.glowGold },
  headerRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  headerCell: { flex: 1, aspectRatio: 1.8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerText: { color: '#fff', fontWeight: '900', fontSize: 20 },
  row: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cellDabbed: { backgroundColor: '#fff' },
  cellCalled: { backgroundColor: 'rgba(255,209,102,0.18)', borderColor: colors.gold },
  cellWrong: { backgroundColor: 'rgba(239,71,111,0.25)', borderColor: colors.error },
  cellText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  markDot: { position: 'absolute', top: 2, right: 2, backgroundColor: colors.primary, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pagerDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 },
  pagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  pagerDotActive: { width: 20, backgroundColor: colors.gold },
  powerBar: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  powerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', backgroundColor: colors.surface, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  powerBtnActive: { borderColor: colors.gold, backgroundColor: colors.gold + '22' },
  powerLabel: { ...type.caption, color: colors.text, fontSize: 12, fontWeight: '700' as const },
  powerCount: { backgroundColor: colors.primary, paddingHorizontal: 6, borderRadius: 999, minWidth: 20, alignItems: 'center' },
  powerCountText: { color: '#fff', fontWeight: '800' as const, fontSize: 10 },
  floatingZone: { position: 'absolute', top: '40%', right: 24, alignItems: 'flex-end', gap: 4 },
  floatText: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, gap: 10 },
  bingoBtn: { flex: 1, height: 58, borderRadius: 999, overflow: 'hidden', ...shadows.glowGold },
  bingoBtnDisabled: { shadowOpacity: 0 },
  bingoGrad: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  bingoText: { color: colors.onGold, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  bigBall: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', ...shadows.glowPrimary },
  bigLetter: { color: '#fff', fontSize: 40, fontWeight: '900' },
  bigNum: { color: '#fff', fontSize: 72, fontWeight: '900', lineHeight: 80 },
  callTip: { color: colors.gold, marginTop: 20, fontWeight: '700', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, gap: 12 },
  sheetTitle: { ...type.title, color: colors.text, textAlign: 'center' },
  emoteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  emoteBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  emoteText: { fontSize: 28 },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: colors.modalOverlay },
  howToCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2, borderColor: colors.gold, gap: 4 },
  howToTitle: { ...type.h3, color: colors.text, marginBottom: 8, textAlign: 'center' },
  howToBtn: { marginTop: 12, borderRadius: 999, overflow: 'hidden' },
});
