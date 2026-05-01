import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function Friends() {
  const router = useRouter();
  const [friends, setFriends] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [user, setUser] = useState<any>(null);

  const load = useCallback(async () => {
    const u = await storage.getUser(); setUser(u);
    if (u) setFriends(await api.friends(u.id).catch(() => []));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!code.trim() || !user) return;
    try { await api.addFriend(user.id, code.trim().toUpperCase()); setCode(''); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="friends-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Friends</Text>
          <View style={{ width: 40 }} />
        </View>

        {user && (
          <View style={styles.myCode}>
            <Text style={styles.myCodeLabel}>Your friend code</Text>
            <Text style={styles.myCodeVal}>{user.friend_code}</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput value={code} onChangeText={setCode} placeholder="Enter friend code (e.g. AB12CD34)" placeholderTextColor={colors.textMute} style={styles.input} autoCapitalize="characters" testID="add-friend-input-field" />
          <TouchableOpacity onPress={add} style={styles.addBtn} testID="add-friend-submit">
            <MaterialCommunityIcons name="account-plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
          {friends.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-multiple-plus" size={56} color={colors.textMute} />
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptySub}>Share your code or add friends by code to start playing together.</Text>
            </View>
          ) : friends.map((f) => (
            <View key={f.user_id} style={styles.row} testID="friend-list-item">
              <Image source={{ uri: f.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{f.username}</Text>
                <View style={styles.sub}>
                  <View style={[styles.dot, { backgroundColor: f.online ? colors.success : colors.textMute }]} />
                  <Text style={styles.subText}>{f.online ? 'Online' : 'Offline'} • Lvl {f.level}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.inviteBtn}>
                <MaterialCommunityIcons name="gamepad-variant" size={16} color="#fff" />
                <Text style={styles.inviteText}>Play</Text>
              </TouchableOpacity>
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
  myCode: { backgroundColor: colors.surface, marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  myCodeLabel: { ...type.caption, color: colors.textDim },
  myCodeVal: { ...type.h3, color: colors.gold, letterSpacing: 2 },
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginTop: spacing.md },
  input: { flex: 1, backgroundColor: colors.surface, color: colors.text, padding: spacing.md, borderRadius: radius.md, ...type.body, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  addBtn: { backgroundColor: colors.primary, width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  emptyTitle: { ...type.title, color: colors.text, marginTop: 10 },
  emptySub: { ...type.caption, color: colors.textDim, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { ...type.body, color: colors.text },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subText: { ...type.caption, color: colors.textDim },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inviteBtn: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  inviteText: { ...type.caption, color: '#fff', fontWeight: '700' as const },
});
