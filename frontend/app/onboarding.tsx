import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBg from '../src/ScreenBg';
import GradientButton from '../src/GradientButton';
import { colors, spacing, type, media } from '../src/theme';
import { storage } from '../src/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const slides = [
  { key: '1', title: 'Play Bingo with Friends', subtitle: 'Invite friends, join rooms and blast through rounds together.', img: media.balls, icon: 'account-group' as const },
  { key: '2', title: 'Win Bcoins & Rewards', subtitle: 'Earn coins, spin the wheel, collect daily goodies and unlock rewards.', img: media.coins, icon: 'trophy-variant' as const },
  { key: '3', title: 'Rooms, Tournaments & Events', subtitle: 'Compete in free rooms, prestige tables and big tournament events.', img: media.tournament, icon: 'fire' as const },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const goNext = async () => {
    if (index < slides.length - 1) {
      const next = index + 1;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      await storage.setOnboarded();
      router.replace('/login');
    }
  };

  const skip = async () => {
    await storage.setOnboarded();
    router.replace('/login');
  };

  return (
    <ScreenBg>
      <SafeAreaView style={styles.container} testID="onboarding-screen">
        <View style={styles.topBar}>
          <View />
          <TouchableOpacity onPress={skip} testID="onboarding-skip-btn">
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(i) => i.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, alignItems: 'center', paddingHorizontal: spacing.xl }}>
              <View style={styles.imageWrap}>
                <Image source={{ uri: item.img }} style={styles.heroImage} />
              </View>
              <View style={styles.iconBubble}>
                <MaterialCommunityIcons name={item.icon} size={28} color={colors.gold} />
              </View>
              <Text style={styles.title} testID="onboarding-step-text">{item.title}</Text>
              <Text style={styles.sub}>{item.subtitle}</Text>
            </View>
          )}
        />

        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, index === i && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.ctaWrap}>
          <GradientButton
            label={index === slides.length - 1 ? 'Get Started' : 'Next'}
            onPress={goNext}
            testID="onboarding-next-btn"
            icon={<MaterialCommunityIcons name="arrow-right" size={22} color="#fff" />}
            size="lg"
          />
        </View>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  skip: { ...type.body, color: colors.textDim },
  imageWrap: {
    width: width * 0.7, height: width * 0.7, borderRadius: 200, overflow: 'hidden',
    marginTop: spacing.xl, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  iconBubble: {
    marginTop: -20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.gold,
  },
  title: { ...type.h2, color: colors.text, textAlign: 'center', marginTop: spacing.lg },
  sub: { ...type.body, color: colors.textDim, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 24, backgroundColor: colors.primary },
  ctaWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
