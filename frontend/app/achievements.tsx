import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function Achievements() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);

  const load = useCallback(async () => {
    const u = await storage.getUser(); if (!u) return;
    try { setData(await api.achievements(u.id)); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unlocked = data.filter((d) => d.unlocked).length;

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="achievements-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Achievements</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={gradients.gold as any} style={[styles.summary, shadows.glowGold]}>
          <MaterialCommunityIcons name="medal" size={40} color={colors.onGold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sumLabel}>PROGRESS</Text>
            <Text style={styles.sumTitle}>{unlocked} / {data.length} unlocked</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.grid}>
          {data.map((a) => (
            <View key={a.id} style={[styles.card, a.unlocked ? { borderColor: colors.gold } : { opacity: 0.55 }]} testID="badge-item">
              <View style={[styles.iconWrap, a.unlocked && { backgroundColor: colors.surfaceHi, borderColor: colors.gold }]}>
                <MaterialCommunityIcons name={a.unlocked ? 'check-decagram' : 'lock'} size={36} color={a.unlocked ? colors.gold : colors.textDim} />
              </View>
              <Text style={styles.name}>{a.name}</Text>
              <Text style={styles.desc}>{a.desc}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (a.progress / a.target) * 100)}%`, backgroundColor: a.unlocked ? colors.gold : colors.secondary }]} />
              </View>
              <Text style={styles.progressText}>{Math.min(a.progress, a.target)} / {a.target}</Text>
              <View style={styles.rewardTag}><Text style={styles.rewardText}>+{a.reward} BC</Text></View>
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
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  sumLabel: { ...type.badge, color: colors.onGold, opacity: 0.8 },
  sumTitle: { ...type.h3, color: colors.onGold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: 10, paddingBottom: 60 },
  card: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)' },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  name: { ...type.body, color: colors.text, textAlign: 'center' },
  desc: { ...type.caption, color: colors.textDim, textAlign: 'center', fontSize: 11 },
  progressBar: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.surfaceHi, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%' },
  progressText: { ...type.caption, color: colors.textDim, fontSize: 10 },
  rewardTag: { backgroundColor: colors.surfaceHi, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.gold },
  rewardText: { ...type.caption, color: colors.gold, fontSize: 11, fontWeight: '800' as const },
});
