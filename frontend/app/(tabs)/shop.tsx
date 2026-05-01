import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBg from '../../src/ScreenBg';
import HeaderBar from '../../src/HeaderBar';
import { colors, gradients, radius, shadows, spacing, type, media } from '../../src/theme';
import { api, storage } from '../../src/api';

export default function Shop() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    const u = await storage.getUser(); setUser(u);
    try { setItems(await api.shopItems()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const purchase = async (item: any) => {
    if (!user) return;
    try {
      const order = await api.createRazorpayOrder(user.id, item.id);
      if (order.mocked) {
        Alert.alert(
          'Test Purchase',
          `Razorpay not configured. Simulate a successful payment for ${item.name} (₹${item.price_inr})?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Simulate Pay', onPress: async () => {
                await api.verifyRazorpay({
                  user_id: user.id, item_id: item.id,
                  razorpay_order_id: order.order_id,
                  razorpay_payment_id: `pay_mock_${Date.now()}`,
                  razorpay_signature: 'mock_sig',
                });
                Alert.alert('Success!', `Added ${item.name} to your account.`);
                await load();
              }
            },
          ]
        );
      } else {
        Alert.alert('Razorpay', 'Razorpay checkout (WebView) flow — configure keys to open full checkout.');
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const bcoins = items.filter((i) => i.type === 'bcoins');
  const cards = items.filter((i) => i.type === 'room_card');
  const powerups = items.filter((i) => i.type === 'powerup');

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }} testID="shop-screen">
        <HeaderBar user={user} testIDPrefix="shop" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={styles.title}>Shop</Text>

          {/* Limited offer */}
          <View style={[styles.offerCard, shadows.glowPrimary]}>
            <LinearGradient colors={gradients.tournament as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offerGrad}>
              <Image source={{ uri: media.coins }} style={styles.offerImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTag}>LIMITED OFFER</Text>
                <Text style={styles.offerTitle}>2x Bonus Coins</Text>
                <Text style={styles.offerSub}>Grab double Bcoins on any purchase today!</Text>
              </View>
            </LinearGradient>
          </View>

          <Text style={styles.section}>Bcoin Packages</Text>
          <View style={styles.grid}>
            {bcoins.map((it) => (
              <TouchableOpacity key={it.id} onPress={() => purchase(it)} style={styles.pkgCard} testID={`buy-${it.id}`} activeOpacity={0.85}>
                {it.badge && (<View style={styles.pkgBadge}><Text style={styles.pkgBadgeText}>{it.badge}</Text></View>)}
                <MaterialCommunityIcons name="star-four-points" size={36} color={colors.gold} />
                <Text style={styles.pkgAmount}>{it.amount}</Text>
                <Text style={styles.pkgName}>{it.name}</Text>
                <LinearGradient colors={gradients.gold as any} style={styles.priceTag}>
                  <Text style={styles.priceText}>₹{it.price_inr}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.section}>Room Cards</Text>
          <View style={styles.grid}>
            {cards.map((it) => (
              <TouchableOpacity key={it.id} onPress={() => purchase(it)} style={styles.pkgCard} testID={`buy-${it.id}`} activeOpacity={0.85}>
                <LinearGradient colors={it.tier === 'luxury' ? gradients.luxury : gradients.prestige} style={styles.cardIcon}>
                  <MaterialCommunityIcons name={it.tier === 'luxury' ? 'crown' : 'diamond-stone'} size={30} color="#fff" />
                </LinearGradient>
                <Text style={styles.pkgName}>{it.name}</Text>
                <LinearGradient colors={gradients.gold as any} style={styles.priceTag}>
                  <Text style={styles.priceText}>₹{it.price_inr}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.section}>Power-ups</Text>
          <View style={styles.grid}>
            {powerups.map((it) => (
              <TouchableOpacity key={it.id} onPress={() => purchase(it)} style={styles.pkgCard} testID={`buy-${it.id}`} activeOpacity={0.85}>
                <LinearGradient colors={gradients.secondary as any} style={styles.cardIcon}>
                  <MaterialCommunityIcons name="flash" size={30} color="#fff" />
                </LinearGradient>
                <Text style={styles.pkgName}>{it.name}</Text>
                <LinearGradient colors={gradients.gold as any} style={styles.priceTag}>
                  <Text style={styles.priceText}>₹{it.price_inr}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.text, paddingHorizontal: spacing.md, marginTop: 4 },
  offerCard: { marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
  offerGrad: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 12 },
  offerImg: { width: 70, height: 70, resizeMode: 'contain' },
  offerTag: { ...type.badge, color: colors.gold, fontSize: 10 },
  offerTitle: { ...type.h3, color: '#fff' },
  offerSub: { ...type.caption, color: 'rgba(255,255,255,0.85)' },
  section: { ...type.title, color: colors.text, marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: 12 },
  pkgCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...shadows.md },
  pkgBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pkgBadgeText: { ...type.badge, color: '#fff', fontSize: 9 },
  pkgAmount: { ...type.h3, color: colors.gold },
  pkgName: { ...type.body, color: colors.text, textAlign: 'center' },
  cardIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  priceTag: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  priceText: { ...type.body, color: colors.onGold, fontWeight: '800' as const },
});
