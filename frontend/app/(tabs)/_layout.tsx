import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows, gradients } from '../../src/theme';

function TabIcon({ name, focused }: { name: any; focused: boolean }) {
  if (!focused) return <MaterialCommunityIcons name={name} size={26} color={colors.textDim} />;
  return (
    <View style={styles.activeWrap}>
      <LinearGradient colors={gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activePill}>
        <MaterialCommunityIcons name={name} size={24} color="#fff" />
      </LinearGradient>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 76,
          paddingTop: 6,
          paddingBottom: 14,
          ...shadows.md,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon name="home-variant" focused={focused} />, tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen
        name="rooms"
        options={{ title: 'Rooms', tabBarIcon: ({ focused }) => <TabIcon name="door-open" focused={focused} />, tabBarButtonTestID: 'tab-rooms' }} />
      <Tabs.Screen
        name="shop"
        options={{ title: 'Shop', tabBarIcon: ({ focused }) => <TabIcon name="cart-variant" focused={focused} />, tabBarButtonTestID: 'tab-shop' }} />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Ranks', tabBarIcon: ({ focused }) => <TabIcon name="trophy-variant" focused={focused} />, tabBarButtonTestID: 'tab-leaderboard' }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon name="account-circle" focused={focused} />, tabBarButtonTestID: 'tab-profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeWrap: { marginTop: -6 },
  activePill: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', ...shadows.glowPrimary },
});
