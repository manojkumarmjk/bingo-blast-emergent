import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, ZoomIn } from 'react-native-reanimated';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, gradients, radius, shadows, spacing, type } from '../src/theme';
import { api, storage } from '../src/api';

const SEGMENTS = [
  { label: '25 BC', color: '#F72585' },
  { label: '50 BC', color: '#4CC9F0' },
  { label: '100 BC', color: '#FFD166' },
  { label: 'CARD', color: '#06D6A0' },
  { label: '250 BC', color: '#9D4EDD' },
  { label: '500 BC', color: '#FF9F1C' },
  { label: 'POWER', color: '#EF476F' },
  { label: 'JACKPOT', color: '#FFD166' },
];

export default function SpinWheel() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const rotation = useSharedValue(0);

  const spin = async () => {
    const stored = await storage.getUser();
    if (!stored) return;
    setSpinning(true);
    try {
      const res = await api.spinWheel(stored.id);
      const segmentSize = 360 / SEGMENTS.length;
      const target = res.segment_index * segmentSize;
      // Animate: multiple rotations + target
      rotation.value = 0;
      rotation.value = withTiming(360 * 5 + (360 - target) - segmentSize / 2, { duration: 4000, easing: Easing.bezier(0.23, 1, 0.32, 1) });
      setTimeout(() => { setResult(res.reward); setSpinning(false); }, 4100);
    } catch (e: any) {
      setSpinning(false);
      Alert.alert('Spin', e.message);
    }
  };

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="spin-wheel-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Daily Spin</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.sub}>Spin every 6 hours for free rewards!</Text>

        <View style={styles.wheelContainer}>
          <View style={styles.pointer}>
            <MaterialCommunityIcons name="menu-down" size={44} color={colors.gold} />
          </View>
          <Animated.View style={[styles.wheel, wheelStyle, shadows.glowPrimary]}>
            {SEGMENTS.map((seg, i) => (
              <View
                key={i}
                style={[
                  styles.segment,
                  { transform: [{ rotate: `${i * (360 / SEGMENTS.length)}deg` }] },
                ]}>
                <View style={[styles.segFill, { backgroundColor: seg.color }]}>
                  <Text style={styles.segText}>{seg.label}</Text>
                </View>
              </View>
            ))}
            <View style={styles.hub}>
              <MaterialCommunityIcons name="star-four-points" size={36} color={colors.gold} />
            </View>
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: 20 }}>
          <GradientButton
            label={spinning ? 'Spinning...' : 'SPIN!'}
            variant="gold"
            onPress={spin}
            loading={spinning}
            testID="spin-action-btn"
            size="lg"
            icon={<MaterialCommunityIcons name="ferris-wheel" size={22} color={colors.onGold} />}
          />
        </View>

        <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
          <View style={styles.modalBg}>
            <Animated.View entering={ZoomIn} style={[styles.resultCard, shadows.glowGold]}>
              <LinearGradient colors={gradients.gold as any} style={styles.resultCircle}>
                <MaterialCommunityIcons name="gift" size={44} color={colors.onGold} />
              </LinearGradient>
              <Text style={styles.resultLabel}>YOU WON</Text>
              <Text style={styles.resultVal}>{result?.label}</Text>
              <Text style={styles.resultDesc}>{result?.type === 'bcoins' ? `+${result.amount} Bcoins added to wallet` : 'Added to inventory'}</Text>
              <GradientButton label="Claim" onPress={() => setResult(null)} testID="reward-claim-btn" style={{ marginTop: 16 }} />
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBg>
  );
}

const WHEEL_SIZE = 300;
const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textDim, textAlign: 'center', marginVertical: spacing.sm },
  wheelContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  pointer: { position: 'absolute', top: -2, zIndex: 10 },
  wheel: { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2, overflow: 'hidden', borderWidth: 6, borderColor: colors.gold, backgroundColor: colors.surface },
  segment: { position: 'absolute', width: '50%', height: '50%', left: '50%', top: '50%', transformOrigin: '0% 0%' },
  segFill: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, transform: [{ skewY: '-45deg' }], borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.2)' },
  segText: { transform: [{ skewY: '45deg' }, { rotate: '22.5deg' }], color: '#fff', fontWeight: '900', fontSize: 12 },
  hub: { position: 'absolute', top: '50%', left: '50%', marginLeft: -28, marginTop: -28, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.gold },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.modalOverlay },
  resultCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: colors.gold, gap: 8 },
  resultCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  resultLabel: { ...type.badge, color: colors.gold, marginTop: 8 },
  resultVal: { ...type.h2, color: colors.text },
  resultDesc: { ...type.body, color: colors.textDim, textAlign: 'center' },
});
