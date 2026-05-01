import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import { colors, radius, shadows, spacing, type } from '../src/theme';
import { storage } from '../src/api';

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState({ sound: true, music: true, notifications: true, vibration: true });

  useEffect(() => {
    storage.getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s })));
  }, []);

  const update = (key: string, val: boolean) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    storage.setSettings(next);
  };

  const logout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await storage.clearUser();
        router.replace('/login');
      }},
    ]);
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="settings-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
          <SectionTitle text="Audio" />
          <Toggle icon="volume-high" label="Sound Effects" value={settings.sound} onChange={(v) => update('sound', v)} testID="sound-toggle" />
          <Toggle icon="music" label="Background Music" value={settings.music} onChange={(v) => update('music', v)} testID="music-toggle" />
          <Toggle icon="vibrate" label="Vibration" value={settings.vibration} onChange={(v) => update('vibration', v)} testID="vibration-toggle" />

          <SectionTitle text="Notifications" />
          <Toggle icon="bell" label="Push Notifications" value={settings.notifications} onChange={(v) => update('notifications', v)} testID="notifications-toggle" />

          <SectionTitle text="Account & Privacy" />
          <LinkRow icon="shield-check" label="Privacy Policy" onPress={() => Alert.alert('Privacy', 'Full policy available at bingoblast.app/privacy')} />
          <LinkRow icon="file-document" label="Terms of Service" onPress={() => Alert.alert('Terms', 'Full terms at bingoblast.app/terms')} />
          <LinkRow icon="help-circle" label="Help & Support" onPress={() => Alert.alert('Support', 'Email support@bingoblast.app')} />
          <LinkRow icon="information" label="About" onPress={() => Alert.alert('Bingo Blast', 'Version 1.0.0\nBuilt with ❤️ for bingo fans')} />

          <View style={{ height: 20 }} />
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} testID="logout-btn">
            <MaterialCommunityIcons name="logout" size={22} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.section}>{text}</Text>;
}

function Toggle({ icon, label, value, onChange, testID }: any) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.surfaceHi, true: colors.primary }} thumbColor="#fff" testID={testID} />
    </View>
  );
}

function LinkRow({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      <Text style={styles.label}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textDim} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  section: { ...type.badge, color: colors.textDim, marginTop: spacing.lg, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.md, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  label: { flex: 1, ...type.body, color: colors.text },
  logoutBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error, padding: spacing.md, borderRadius: 999 },
  logoutText: { ...type.body, color: '#fff', fontWeight: '800' as const },
});
