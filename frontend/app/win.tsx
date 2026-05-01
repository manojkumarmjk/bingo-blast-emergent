import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Share, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, ZoomIn } from 'react-native-reanimated';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, gradients, radius, shadows, spacing, type, media } from '../src/theme';

export default function Win() {
  const router = useRouter();
  const { winner, prize } = useLocalSearchParams<{ winner?: string; prize?: string }>();
  const rotate = useSharedValue(0);

  const amWinner = winner === 'user';

  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false);
  }, [rotate]);

  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  const share = async () => {
    await Share.share({ message: amWinner ? `I just won ${prize} Bcoins on Bingo Blast! 🎉 Play with me!` : 'Join me on Bingo Blast!' });
  };

  return (
    <ScreenBg>
      <SafeAreaView style={styles.container} testID="win-screen-modal">
        <Animated.View style={[styles.rays, raysStyle]}>
          <LinearGradient colors={amWinner ? gradients.gold : gradients.secondary} style={styles.raysInner} />
        </Animated.View>

        <Animated.View entering={ZoomIn} style={[styles.card, shadows.glowGold]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={amWinner ? 'trophy' : 'emoticon-sad-outline'} size={60} color={colors.gold} />
          </View>
          <Text style={styles.bigTitle}>{amWinner ? 'BINGO!' : 'Almost!'}</Text>
          <Text style={styles.subTitle}>{amWinner ? 'You won the match' : 'Better luck next round'}</Text>

          {amWinner && (
            <View style={styles.rewardBlock} testID="winner-reward-text">
              <Text style={styles.rewardLabel}>REWARD EARNED</Text>
              <View style={styles.rewardRow}>
                <MaterialCommunityIcons name="star-four-points" size={26} color={colors.gold} />
                <Text style={styles.rewardAmt}>+{prize || '0'}</Text>
                <Text style={styles.rewardBC}>Bcoins</Text>
              </View>
            </View>
          )}

          <View style={styles.stats}>
            <Stat label="Status" value={amWinner ? 'Winner' : 'Finished'} />
            <Stat label="Time" value="Good match!" />
          </View>

          <View style={{ width: '100%', gap: 10, marginTop: spacing.md }}>
            <GradientButton
              label="Play Again"
              variant="gold"
              testID="play-again-btn"
              icon={<MaterialCommunityIcons name="replay" size={20} color={colors.onGold} />}
              onPress={() => router.replace({ pathname: '/game', params: { mode: 'computer' } })}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GradientButton
                label="Home" variant="secondary" style={{ flex: 1 }} testID="back-home-btn"
                onPress={() => router.replace('/(tabs)')}
              />
              <GradientButton
                label="Share" variant="secondary" style={{ flex: 1 }} testID="share-win-btn"
                onPress={share}
                icon={<MaterialCommunityIcons name="share-variant" size={18} color={colors.primary} />}
              />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </ScreenBg>
  );
}

function Stat({ label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  rays: { position: 'absolute', width: 600, height: 600, alignItems: 'center', justifyContent: 'center', opacity: 0.15 },
  raysInner: { width: '80%', height: '80%', borderRadius: 400 },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: 10, borderWidth: 2, borderColor: colors.gold },
  iconCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.gold, ...shadows.glowGold },
  bigTitle: { ...type.h1, color: colors.gold, letterSpacing: 2 },
  subTitle: { ...type.body, color: colors.textDim, marginTop: -6 },
  rewardBlock: { alignItems: 'center', marginTop: 12, padding: spacing.md, backgroundColor: colors.surfaceHi, borderRadius: radius.md, width: '100%' },
  rewardLabel: { ...type.badge, color: colors.textDim, fontSize: 10 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rewardAmt: { ...type.h2, color: colors.gold },
  rewardBC: { ...type.body, color: colors.textDim },
  stats: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  statBox: { flex: 1, backgroundColor: colors.surfaceHi, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  statLabel: { ...type.caption, color: colors.textDim, fontSize: 10 },
  statVal: { ...type.body, color: colors.text },
});
