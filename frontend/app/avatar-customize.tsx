import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { LoadingState } from '../src/StateViews';
import { colors, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

const TABS = [
  { key: 'frames', label: 'Frames', icon: 'circle-double' },
  { key: 'titles', label: 'Titles', icon: 'tag' },
  { key: 'backgrounds', label: 'Themes', icon: 'palette' },
] as const;

export default function AvatarCustomize() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'frames' | 'titles' | 'backgrounds'>('frames');

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return; setUser(u);
    try { setData(await api.cosmetics(u.id)); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const equip = async (id: string) => {
    if (!user) return;
    try {
      await api.cosmeticsEquip(user.id, tab, id);
      await load();
    } catch (e: any) { Alert.alert('Locked', e.message); }
  };

  if (!data) return <ScreenBg><SafeAreaView style={{ flex: 1 }}><LoadingState message="Loading cosmetics..." /></SafeAreaView></ScreenBg>;

  const items = data.cosmetics[tab] || [];
  const equippedKey = tab === 'frames' ? 'frame' : tab === 'titles' ? 'title' : 'background';
  const equipped = data.equipped?.[equippedKey];
  const equippedFrame = data.cosmetics.frames.find((f: any) => f.id === data.equipped?.frame);

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="avatar-customize-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Customize Avatar</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <View style={[styles.frame, { borderColor: equippedFrame?.color || colors.primary }]}>
            <Image source={{ uri: user?.avatar }} style={styles.avatar} />
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          {data.cosmetics.titles.find((t: any) => t.id === data.equipped?.title) && (
            <View style={styles.titleBadge}>
              <Text style={styles.titleText}>{data.cosmetics.titles.find((t: any) => t.id === data.equipped?.title)?.name}</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
              <MaterialCommunityIcons name={t.icon as any} size={16} color={tab === t.key ? '#fff' : colors.textDim} />
              <Text style={[styles.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.grid}>
          {items.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => item.unlocked && equip(item.id)}
              disabled={!item.unlocked}
              style={[styles.itemCard, equipped === item.id && styles.itemEquipped, !item.unlocked && { opacity: 0.5 }]}
              testID={`cosmetic-${item.id}`}>
              {tab === 'frames' && (
                <View style={[styles.itemFrame, { borderColor: item.color }]}>
                  <View style={[styles.frameInner, { backgroundColor: item.color + '33' }]} />
                </View>
              )}
              {tab === 'backgrounds' && (
                <View style={[styles.itemBg, { backgroundColor: item.color }]}>
                  <MaterialCommunityIcons name="image" size={20} color="rgba(255,255,255,0.5)" />
                </View>
              )}
              {tab === 'titles' && (
                <View style={styles.itemTitle}>
                  <MaterialCommunityIcons name="tag" size={20} color={colors.gold} />
                </View>
              )}
              <Text style={styles.itemName}>{item.name}</Text>
              {item.rarity && <Text style={[styles.rarity, { color: item.rarity === 'legendary' ? colors.gold : item.rarity === 'epic' ? colors.primary : colors.secondary }]}>{item.rarity.toUpperCase()}</Text>}
              {!item.unlocked && (
                <View style={styles.lockBadge}>
                  <MaterialCommunityIcons name="lock" size={12} color={colors.textDim} />
                  <Text style={styles.lockText}>{item.unlock}</Text>
                </View>
              )}
              {equipped === item.id && <View style={styles.equippedBadge}><Text style={styles.equippedText}>EQUIPPED</Text></View>}
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
  preview: { alignItems: 'center', padding: spacing.md, gap: 8 },
  frame: { width: 130, height: 130, borderRadius: 65, borderWidth: 5, alignItems: 'center', justifyContent: 'center', padding: 4 },
  avatar: { width: 116, height: 116, borderRadius: 58 },
  username: { ...type.h3, color: colors.text },
  titleBadge: { backgroundColor: colors.gold + '33', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.gold },
  titleText: { ...type.caption, color: colors.gold, fontWeight: '800' as const },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...type.caption, color: colors.textDim, fontWeight: '700' as const },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: 10, paddingBottom: 40 },
  itemCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  itemEquipped: { borderColor: colors.gold, ...shadows.glowGold },
  itemFrame: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  frameInner: { width: '100%', height: '100%', borderRadius: 32 },
  itemBg: { width: 70, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHi },
  itemName: { ...type.body, color: colors.text, fontSize: 14 },
  rarity: { ...type.badge, fontSize: 9, fontWeight: '900' as const },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lockText: { ...type.caption, color: colors.textDim, fontSize: 10 },
  equippedBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  equippedText: { ...type.badge, color: colors.onGold, fontSize: 8 },
});
