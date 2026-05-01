import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Share, Image } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function InviteFriends() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendCode, setFriendCode] = useState('');

  const load = useCallback(async () => {
    const u = await storage.getUser(); setUser(u);
    if (u) setFriends(await api.friends(u.id).catch(() => []));
    if (params.roomId) setRoom(await api.getRoom(params.roomId).catch(() => null));
  }, [params.roomId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const copy = async () => {
    const code = room?.code || user?.friend_code || '';
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `Code ${code} copied to clipboard`);
  };

  const share = async () => {
    const code = room?.code || user?.friend_code || '';
    await Share.share({ message: `Join me in Bingo Blast! Room code: ${code}` });
  };

  const addFriend = async () => {
    if (!friendCode.trim() || !user) return;
    try {
      await api.addFriend(user.id, friendCode.trim().toUpperCase());
      setFriendCode('');
      await load();
      Alert.alert('Success', 'Friend added!');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const code = room?.code || user?.friend_code || '...';

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="invite-friends-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Invite Friends</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
          <View style={[styles.codeCard, shadows.glowPrimary]}>
            <LinearGradient colors={gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.codeGrad}>
              <Text style={styles.codeLabel}>{room ? 'ROOM CODE' : 'YOUR FRIEND CODE'}</Text>
              <Text style={styles.codeVal}>{code}</Text>
              <Text style={styles.codeHint}>Share this with friends to join</Text>
              <View style={styles.codeBtns}>
                <TouchableOpacity onPress={copy} style={styles.codeBtn} testID="copy-code-btn">
                  <MaterialCommunityIcons name="content-copy" size={18} color="#fff" />
                  <Text style={styles.codeBtnText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={share} style={styles.codeBtn} testID="share-code-btn">
                  <MaterialCommunityIcons name="share-variant" size={18} color="#fff" />
                  <Text style={styles.codeBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <Text style={styles.section}>Add Friend by Code</Text>
          <View style={styles.inputRow}>
            <TextInput value={friendCode} onChangeText={setFriendCode} placeholder="Enter friend code" placeholderTextColor={colors.textMute} style={styles.input} autoCapitalize="characters" testID="add-friend-input" />
            <TouchableOpacity onPress={addFriend} style={styles.addBtn} testID="add-friend-btn">
              <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.section}>Friends ({friends.length})</Text>
          {friends.length === 0 && <Text style={{ color: colors.textDim, paddingLeft: 4 }}>No friends yet. Use a code above to connect.</Text>}
          {friends.map((f) => (
            <View key={f.user_id} style={styles.friendRow}>
              <Image source={{ uri: f.avatar }} style={styles.friendAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.friendName}>{f.username}</Text>
                <Text style={styles.friendSub}>{f.online ? 'Online' : 'Offline'} • Lvl {f.level}</Text>
              </View>
              <View style={[styles.dot, { backgroundColor: f.online ? colors.success : colors.textMute }]} />
              {room && (
                <TouchableOpacity onPress={share} style={styles.inviteBtn}>
                  <Text style={styles.inviteText}>Invite</Text>
                </TouchableOpacity>
              )}
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
  codeCard: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  codeGrad: { padding: spacing.lg, alignItems: 'center' },
  codeLabel: { ...type.badge, color: '#fff', opacity: 0.8 },
  codeVal: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 4, marginTop: 6 },
  codeHint: { ...type.caption, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  codeBtns: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  codeBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.25)' },
  codeBtnText: { ...type.body, color: '#fff', fontWeight: '700' as const },
  section: { ...type.title, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: colors.surface, color: colors.text, padding: spacing.md, borderRadius: radius.md, ...type.body, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  addBtn: { backgroundColor: colors.primary, width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  friendAvatar: { width: 44, height: 44, borderRadius: 22 },
  friendName: { ...type.body, color: colors.text },
  friendSub: { ...type.caption, color: colors.textDim },
  dot: { width: 10, height: 10, borderRadius: 5 },
  inviteBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  inviteText: { ...type.caption, color: '#fff', fontWeight: '700' as const },
});
