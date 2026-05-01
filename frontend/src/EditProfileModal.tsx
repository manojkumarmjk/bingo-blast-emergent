// Bottom-sheet modal for editing profile name & avatar.
// Shows 12 system avatars fetched from /api/avatars/list and a validated name input.
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  FlatList, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadows, spacing, type } from './theme';
import { api } from './api';

type SysAvatar = { id: string; url: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  user: any;
  onSaved: (updatedUser: any) => void;
}

export default function EditProfileModal({ visible, onClose, user, onSaved }: Props) {
  const [avatars, setAvatars] = useState<SysAvatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user?.avatar || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(user?.username || '');
    setSelectedAvatar(user?.avatar || '');
    setLoadingAvatars(true);
    api.listAvatars()
      .then((r: any) => setAvatars(r.avatars || []))
      .catch(() => setAvatars([]))
      .finally(() => setLoadingAvatars(false));
  }, [visible, user?.username, user?.avatar]);

  const dirty = (name.trim() !== (user?.username || '')) || (selectedAvatar !== user?.avatar);
  const nameValid = name.trim().length >= 2 && name.trim().length <= 18;

  const save = async () => {
    if (!nameValid) {
      Alert.alert('Name too short', 'Please enter 2–18 characters.');
      return;
    }
    if (!dirty) { onClose(); return; }
    setSaving(true);
    try {
      const payload: any = { user_id: user.id };
      if (name.trim() !== user.username) payload.username = name.trim();
      if (selectedAvatar && selectedAvatar !== user.avatar) payload.avatar = selectedAvatar;
      const res = await api.updateUser(payload);
      onSaved(res.user || { ...user, ...payload });
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <View style={styles.sheet} testID="edit-profile-modal">
          <View style={styles.grabber} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.preview}>
            <LinearGradient
              colors={gradients.primary as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.previewRing}
            >
              {selectedAvatar ? (
                <Image source={{ uri: selectedAvatar }} style={styles.previewAvatar} />
              ) : (
                <View style={[styles.previewAvatar, { backgroundColor: colors.surface }]} />
              )}
            </LinearGradient>
            <Text style={styles.previewName} numberOfLines={1}>
              {name.trim() || 'Your name'}
            </Text>
          </View>

          {/* Name input */}
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter 2–18 characters"
            placeholderTextColor={colors.textDim}
            maxLength={18}
            style={[styles.input, !nameValid && name.length > 0 && { borderColor: colors.error }]}
            testID="edit-profile-name"
          />
          <Text style={styles.hint}>{name.trim().length}/18</Text>

          {/* Avatar grid */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Choose Avatar</Text>
          {loadingAvatars ? (
            <View style={styles.avLoad}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={avatars}
              keyExtractor={(a) => a.id}
              numColumns={4}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: 'flex-start', gap: 12 }}
              contentContainerStyle={{ gap: 12, marginTop: 8 }}
              renderItem={({ item }) => {
                const picked = selectedAvatar === item.url;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedAvatar(item.url)}
                    activeOpacity={0.85}
                    style={[styles.avatarCell, picked && styles.avatarCellActive]}
                    testID={`avatar-${item.id}`}
                  >
                    <Image source={{ uri: item.url }} style={styles.avatarImg} />
                    {picked && (
                      <View style={styles.checkMark}>
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Save */}
          <TouchableOpacity
            onPress={save}
            disabled={saving || !nameValid || !dirty}
            activeOpacity={0.85}
            style={[styles.saveBtn, (saving || !nameValid || !dirty) && { opacity: 0.5 }]}
            testID="save-profile-btn"
          >
            <LinearGradient
              colors={gradients.primary as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.saveBtnInner}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-bold" size={18} color="#fff" />
                  <Text style={styles.saveText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: spacing.xl,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...shadows.md,
  },
  grabber: {
    alignSelf: 'center', width: 48, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.h3, color: colors.text },
  preview: { alignItems: 'center', marginVertical: spacing.md, gap: 8 },
  previewRing: {
    width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', padding: 3,
  },
  previewAvatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.surface },
  previewName: { ...type.title, color: colors.text, maxWidth: 240 },
  label: { ...type.caption, color: colors.textDim, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4 },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md, paddingVertical: 12,
    color: colors.text, marginTop: 6, fontSize: 16,
  },
  hint: { ...type.caption, color: colors.textDim, textAlign: 'right', marginTop: 4 },
  avLoad: { paddingVertical: spacing.lg, alignItems: 'center' },
  avatarCell: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  avatarCellActive: { borderColor: colors.primary, ...shadows.glowPrimary },
  avatarImg: { width: 58, height: 58, borderRadius: 29 },
  checkMark: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  saveBtn: { marginTop: spacing.lg, borderRadius: 999, overflow: 'hidden' },
  saveBtnInner: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  saveText: { color: '#fff', fontWeight: '800' as const, fontSize: 16 },
});
