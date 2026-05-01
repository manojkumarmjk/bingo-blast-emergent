import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { LoadingState } from '../src/StateViews';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function Guilds() {
  const router = useRouter();
  const [list, setList] = useState<any[] | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [code, setCode] = useState('');
  const [myGuild, setMyGuild] = useState<any>(null);

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    try {
      const fresh = await api.getUser(u.id);
      setUser(fresh);
      const all = await api.guildList();
      setList(all);
      if (fresh.guild_id) {
        try { setMyGuild(await api.guildDetail(fresh.guild_id)); } catch {}
      } else { setMyGuild(null); }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!user || !name || !tag) return;
    try { await api.guildCreate(user.id, name, tag); setShowCreate(false); setName(''); setTag(''); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const join = async (codeOrId: string) => {
    if (!user) return;
    try { await api.guildJoin(user.id, codeOrId); setShowJoin(false); setCode(''); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const leave = async () => {
    if (!user) return;
    Alert.alert('Leave Guild', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => { await api.guildLeave(user.id); await load(); } },
    ]);
  };

  if (!list) return <ScreenBg><SafeAreaView style={{ flex: 1 }}><LoadingState message="Loading guilds..." /></SafeAreaView></ScreenBg>;

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="guilds-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Guilds</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
          {myGuild ? (
            <LinearGradient colors={gradients.primary as any} style={[styles.myGuild, shadows.glowPrimary]}>
              <View style={styles.guildTagBig}><Text style={styles.guildTagText}>{myGuild.tag}</Text></View>
              <Text style={styles.myGuildName}>{myGuild.name}</Text>
              <Text style={styles.myGuildSub}>{myGuild.member_details?.length || 0} / {myGuild.max_members} members • Code: {myGuild.code}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <View style={styles.statPill}><MaterialCommunityIcons name="trophy" size={14} color={colors.gold} /><Text style={styles.statPillText}>{myGuild.weekly_points} pts</Text></View>
                <View style={styles.statPill}><MaterialCommunityIcons name="star" size={14} color={colors.gold} /><Text style={styles.statPillText}>Lvl {myGuild.level}</Text></View>
              </View>
              <TouchableOpacity onPress={leave} style={styles.leaveBtn}><Text style={styles.leaveText}>Leave Guild</Text></TouchableOpacity>
            </LinearGradient>
          ) : (
            <View style={styles.emptyMine}>
              <MaterialCommunityIcons name="shield-outline" size={48} color={colors.textMute} />
              <Text style={styles.emptyTitle}>You're not in a guild</Text>
              <Text style={styles.emptySub}>Join a clan to play with friends and climb the weekly leaderboard.</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <GradientButton label="Create Guild" onPress={() => setShowCreate(true)} testID="create-guild-btn" icon={<MaterialCommunityIcons name="plus" size={18} color="#fff" />} />
                <GradientButton label="Join by Code" variant="secondary" onPress={() => setShowJoin(true)} testID="join-guild-btn" icon={<MaterialCommunityIcons name="key" size={16} color={colors.primary} />} />
              </View>
              <Text style={styles.cost}>Create cost: 1000 BC</Text>
            </View>
          )}

          <Text style={styles.section}>Top Guilds (Weekly)</Text>
          {list.length === 0 && <Text style={{ color: colors.textDim, textAlign: 'center', padding: spacing.md }}>No guilds yet — be the first!</Text>}
          {list.map((g: any, i: number) => (
            <TouchableOpacity key={g.id} onPress={() => !myGuild && join(g.code)} style={styles.row} testID="guild-row">
              <Text style={styles.rank}>#{i + 1}</Text>
              <View style={styles.guildTag}><Text style={styles.guildTagText}>{g.tag}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gName}>{g.name}</Text>
                <Text style={styles.gSub}>{(g.members || []).length} / {g.max_members} • {g.weekly_points} pts</Text>
              </View>
              {!myGuild && <MaterialCommunityIcons name="plus-circle" size={22} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Create Modal */}
        <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create Guild (1000 BC)</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Guild name" placeholderTextColor={colors.textMute} style={styles.input} maxLength={30} />
              <TextInput value={tag} onChangeText={setTag} placeholder="Short tag (e.g. BNG)" placeholderTextColor={colors.textMute} style={styles.input} maxLength={5} autoCapitalize="characters" />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <GradientButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
                <GradientButton label="Create" style={{ flex: 1 }} onPress={create} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Join Modal */}
        <Modal visible={showJoin} transparent animationType="slide" onRequestClose={() => setShowJoin(false)}>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Join Guild by Code</Text>
              <TextInput value={code} onChangeText={setCode} placeholder="Enter guild code" placeholderTextColor={colors.textMute} style={styles.input} autoCapitalize="characters" />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <GradientButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setShowJoin(false)} />
                <GradientButton label="Join" style={{ flex: 1 }} onPress={() => join(code)} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  myGuild: { padding: spacing.md, borderRadius: radius.lg, alignItems: 'center', gap: 4 },
  guildTagBig: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  guildTagText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 2 },
  myGuildName: { ...type.h2, color: '#fff' },
  myGuildSub: { ...type.caption, color: 'rgba(255,255,255,0.85)' },
  statPill: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statPillText: { ...type.caption, color: '#fff', fontWeight: '700' as const },
  leaveBtn: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginTop: 10 },
  leaveText: { ...type.caption, color: '#fff', fontWeight: '700' as const },
  emptyMine: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 6 },
  emptyTitle: { ...type.title, color: colors.text, marginTop: 8 },
  emptySub: { ...type.caption, color: colors.textDim, textAlign: 'center' },
  cost: { ...type.caption, color: colors.gold, marginTop: 8 },
  section: { ...type.title, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  rank: { ...type.title, color: colors.textDim, width: 36 },
  guildTag: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  gName: { ...type.body, color: colors.text },
  gSub: { ...type.caption, color: colors.textDim },
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { ...type.title, color: colors.text, textAlign: 'center', marginBottom: 8 },
  input: { backgroundColor: colors.surfaceHi, color: colors.text, padding: spacing.md, borderRadius: radius.md, ...type.body, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
});
