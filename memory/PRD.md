# Bingo Blast - Product Requirements Document

## Overview
**Bingo Blast** is a premium, addictive multiplayer Bingo mobile game built with Expo (React Native) + FastAPI + MongoDB. Designed for the Indian casual gaming market with ₹ pricing via Razorpay.

## Core Loop (Phase A — transforms passive to active)
- **Manual dabbing** — players tap cells when numbers are called. Tap an uncalled number → red flash, no mark.
- **Speed bonus** — dab within 1.5s of call → +2 XP "QUICK!" floating text
- **Multi-card play** — default 2 cards in Computer mode (up to 4), horizontal swipe between cards
- **3 Power-ups** — Dauber (auto-mark next 3), Reveal (peek next 3 numbers), 2x (double reward)
- **Near-bingo glow** — card header shows "1 away on 2 lines!" / "BINGO READY!" when close
- **How-to-play overlay** — shown on first game launch, dismissible
- **Anti-cheat** — server rejects claims with uncalled dabs or incomplete lines

## Retention (Phase B — daily hooks)
- **Daily Missions** — 3 randomly selected per day from 10 templates (Win 2, Dab 50, Speed 10, etc.), +60–300 BC
- **7-day Streak Calendar** — escalating rewards [50, 75, 100, 150, 200, 300, 500] BC; resets after 40h gap
- **Collection System** — 12-ball "Neon Nights" set (Common/Rare/Epic), drop from Spin Wheel + Battle Pass; complete set = 2000 BC

## Monetization & Meta (Phase C)
- **Battle Pass** — 50 tiers/season (28 days), free + premium tracks (₹299); XP earned from play/daily rewards
- **Live Events** — Power Hour (19-20 UTC weekdays) & Weekend Blast with 2x multipliers
- **Razorpay** — integrated with mock fallback mode for Bcoin packs (₹25–₹449) and Premium Pass

## Screens (23 original + 4 engagement)
Splash, Onboarding (3), Login, Home Dashboard, Game Modes, Lobby, Create Room, Invite Friends, Waiting Room, Bingo Game, Number Called Overlay, Win, Shop, Wallet, Spin Wheel, Leaderboard, Tournament, Profile, Achievements, Friends, Chat Overlay, Settings, Error States + **Missions, Battle Pass, Collections, Streak Calendar**

## Tech Stack
- **Frontend**: Expo Router, React Native 0.81, Reanimated, AsyncStorage, expo-linear-gradient
- **Backend**: FastAPI + Motor + native WebSockets + Razorpay SDK
- **DB**: MongoDB — users (with engagement fields: streak_days, bp_xp, missions, collection, powerups, stats), rooms, matches, transactions

## Test coverage
- Iteration 1: 27/27 pass (core 23-screen flow)
- Iteration 2: 45/45 pass (engagement Phase A+B+C)

## Phase 2+ (Future)
- Email / Google OAuth
- LAN multiplayer
- Push notifications (FOMO, friend activity, event starts)
- Guilds/Clubs with weekly club leaderboards
- Avatar frames & titles
- VIP subscription
- Tournament bracket engine
