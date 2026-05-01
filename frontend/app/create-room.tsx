import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

export default function CreateRoom() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preset?: string }>();
  const [name, setName] = useState('My Bingo Room');
  const [roomType, setRoomType] = useState<string>(params.preset || 'free');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [matchCount, setMatchCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const roomTypes = [
    { key: 'free', label: 'Free' },
    { key: 'prestige', label: 'Prestige ₹25' },
    { key: 'luxury', label: 'Luxury ₹150' },
    { key: 'custom', label: 'Custom' },
  ];

  const create = async () => {
    const user = await storage.getUser();
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    try {
      const room = await api.createRoom({
        user_id: user.id, name, room_type: roomType,
        max_players: maxPlayers, match_count: matchCount,
      });
      router.replace({ pathname: '/waiting-room', params: { roomId: room.id } });
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="create-room-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Room</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
          <Label text="Room Name" />
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="gamepad-variant" size={20} color={colors.textDim} />
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Give your room a name" placeholderTextColor={colors.textMute} />
          </View>

          <Label text="Room Type" />
          <View style={styles.chipRow}>
            {roomTypes.map((r) => (
              <TouchableOpacity key={r.key} onPress={() => setRoomType(r.key)} style={[styles.chip, roomType === r.key && styles.chipActive]}>
                <Text style={[styles.chipText, roomType === r.key && { color: '#fff' }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Label text="Max Players" />
          <View style={styles.segRow}>
            {[10, 25].map((n) => (
              <TouchableOpacity key={n} onPress={() => setMaxPlayers(n)} style={[styles.segBtn, maxPlayers === n && styles.segActive]} testID={`max-players-${n}`}>
                <Text style={[styles.segText, maxPlayers === n && { color: '#fff' }]}>{n} players</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Label text="Match Count" />
          <View style={styles.segRow}>
            {[1, 10].map((n) => (
              <TouchableOpacity key={n} onPress={() => setMatchCount(n)} style={[styles.segBtn, matchCount === n && styles.segActive]}>
                <Text style={[styles.segText, matchCount === n && { color: '#fff' }]}>{n} match{n > 1 ? 'es' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information" size={20} color={colors.secondary} />
            <Text style={styles.infoText}>An invite code will be generated once you create the room. Share it to invite friends.</Text>
          </View>

          <GradientButton
            label="Create Room"
            variant="primary"
            loading={loading}
            onPress={create}
            testID="create-room-submit-btn"
            style={{ marginTop: spacing.lg }}
            icon={<MaterialCommunityIcons name="rocket" size={20} color="#fff" />}
            size="lg"
          />
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  label: { ...type.caption, color: colors.textDim, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, color: colors.text, paddingVertical: 12, ...type.body },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...type.caption, color: colors.textDim, fontWeight: '700' as const },
  segRow: { flexDirection: 'row', gap: 10 },
  segBtn: { flex: 1, backgroundColor: colors.surface, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  segActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { ...type.body, color: colors.textDim, fontWeight: '700' as const },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceHi, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  infoText: { ...type.caption, color: colors.textDim, flex: 1 },
});
