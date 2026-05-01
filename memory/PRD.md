# Bingo Blast - Product Requirements Document

## Overview
**Bingo Blast** is a premium, multiplayer Bingo mobile gaming app built with Expo (React Native) + FastAPI + MongoDB. It delivers a colorful casino-style gaming experience with playful bingo energy targeted at casual Indian mobile users.

## Core Features (Phase 1)
1. **Guest Onboarding Flow** — Splash → 3-step onboarding → Login → Home (no mandatory signup)
2. **Full Bingo Game Engine**
   - 5x5 Bingo card with B(1-15), I(16-30), N(31-45), G(46-60), O(61-75) columns
   - FREE center cell
   - Win detection: rows, columns, both diagonals
   - Invalid claim penalty
3. **Three Game Modes**
   - Computer Mode (vs bot with easy/medium/hard difficulty)
   - Online Multiplayer (real-time WebSocket rooms, auto number caller every 3s)
   - Room Tiers: Free, Prestige (₹25), Luxury (₹150), Custom, Tournament
4. **Bcoin Economy** — Starter 500 Bcoins, daily reward (50-200), spin wheel (25 BC → 1000 BC jackpot), match wins, room entry fees
5. **Razorpay Integration** (scaffolded, works with mock mode without keys)
6. **Social** — Friends by code, invite to rooms, quick emotes/chat in-game
7. **Leaderboards** — Daily/Weekly/Monthly/All-time with Top-3 podium & sticky user rank
8. **Tournaments** — Ongoing + Upcoming with prize pools, countdowns, registration
9. **Achievements** — 6 badges with progress tracking & Bcoin rewards on unlock
10. **All 23 screens** as per brief with data-testids

## Design System
- Archetype: "Vibrant Play × Premium Casino" (Dark theme)
- Primary: Magenta #F72585, Secondary: Cyan #4CC9F0, Accent: Gold #FFD166
- Bingo column colors: B=#FF3366, I=#FFD166, N=#06D6A0, G=#4CC9F0, O=#9D4EDD
- Nunito-style bold headings, rounded 24px cards, glow shadows on CTAs
- @expo/vector-icons (NO emojis)
- react-native-reanimated for animations, expo-linear-gradient for gradients

## Tech Stack
- **Frontend**: Expo Router file-based routing, React Native 0.81, Reanimated, AsyncStorage
- **Backend**: FastAPI + Motor (async MongoDB) + native WebSockets + Razorpay SDK
- **DB**: MongoDB collections — users, rooms, matches, transactions

## Bottom Navigation
Home • Rooms • Shop • Leaderboard • Profile

## Phase 2 (Future)
- Email/Google OAuth authentication
- LAN multiplayer
- Push notifications
- Tournament bracket engine
- Friend challenges + spectator mode
