import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API = `${BASE}/api`;
export const WS_URL = (roomId: string, userId: string) => {
  const wsBase = (BASE || '').replace(/^http/, 'ws');
  return `${wsBase}/api/ws/room/${roomId}/${userId}`;
};

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const api = {
  guestLogin: (deviceId: string) =>
    request('/guest/login', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) }),
  getUser: (userId: string) => request(`/user/${userId}`),
  updateUser: (payload: any) =>
    request('/user/update', { method: 'POST', body: JSON.stringify(payload) }),
  listAvatars: () => request('/avatars/list'),
  claimDaily: (userId: string) =>
    request(`/daily-reward/claim?user_id=${userId}`, { method: 'POST' }),
  spinWheel: (userId: string) =>
    request(`/spin-wheel/spin?user_id=${userId}`, { method: 'POST' }),
  listRooms: (filter?: string) => request(`/rooms${filter ? `?filter=${filter}` : ''}`),
  createRoom: (payload: any) =>
    request('/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  getRoom: (id: string) => request(`/rooms/${id}`),
  joinRoom: (id: string, userId: string) =>
    request(`/rooms/${id}/join`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  createComputerMatch: (userId: string, difficulty = 'medium', numCards = 1) =>
    request('/computer-match', { method: 'POST', body: JSON.stringify({ user_id: userId, difficulty, num_cards: numCards }) }),
  callNumber: (matchId: string) =>
    request('/computer-match/call', { method: 'POST', body: JSON.stringify({ match_id: matchId }) }),
  dabNumber: (matchId: string, userId: string, number: number, speedBonus: boolean) =>
    request('/computer-match/dab', { method: 'POST', body: JSON.stringify({ match_id: matchId, user_id: userId, number, speed_bonus: speedBonus }) }),
  usePowerup: (matchId: string, userId: string, powerupId: string) =>
    request(`/computer-match/use-powerup?match_id=${matchId}&user_id=${userId}&powerup_id=${powerupId}`, { method: 'POST' }),
  claimBingo: (matchId: string, userId: string, dabbedNumbers: number[] = [], cardIndex = 0) =>
    request('/computer-match/claim-bingo', { method: 'POST', body: JSON.stringify({ match_id: matchId, user_id: userId, dabbed_numbers: dabbedNumbers, card_index: cardIndex }) }),
  missions: (userId: string) => request(`/missions/${userId}`),
  claimMission: (userId: string, missionId: string) =>
    request('/missions/claim', { method: 'POST', body: JSON.stringify({ user_id: userId, mission_id: missionId }) }),
  battlePass: (userId: string) => request(`/battle-pass/${userId}`),
  bpClaim: (userId: string, tier: number, track: 'free' | 'premium') =>
    request('/battle-pass/claim', { method: 'POST', body: JSON.stringify({ user_id: userId, tier, track }) }),
  bpActivatePremium: (userId: string) =>
    request(`/battle-pass/activate-premium?user_id=${userId}`, { method: 'POST' }),
  collection: (userId: string) => request(`/collection/${userId}`),
  collectionClaim: (userId: string) => request(`/collection/claim?user_id=${userId}`, { method: 'POST' }),
  streak: (userId: string) => request(`/streak/${userId}`),
  currentEvent: () => request('/event/current'),
  // Matchmaking
  matchmakingJoin: (userId: string) =>
    request(`/matchmaking/join?user_id=${userId}`, { method: 'POST' }),
  matchmakingStatus: (entryId: string) => request(`/matchmaking/status/${entryId}`),
  matchmakingCancel: (entryId: string) =>
    request(`/matchmaking/cancel/${entryId}`, { method: 'POST' }),
  // VIP
  vipInfo: (userId: string) => request(`/vip/info/${userId}`),
  vipActivate: (userId: string, planId: string) =>
    request(`/vip/activate?user_id=${userId}&plan_id=${planId}`, { method: 'POST' }),
  // Cosmetics
  cosmetics: (userId: string) => request(`/cosmetics/${userId}`),
  cosmeticsEquip: (userId: string, category: string, itemId: string) =>
    request(`/cosmetics/equip?user_id=${userId}&category=${category}&item_id=${itemId}`, { method: 'POST' }),
  // Guilds
  guildList: () => request('/guilds/list'),
  guildDetail: (guildId: string) => request(`/guilds/${guildId}`),
  guildCreate: (userId: string, name: string, tag: string) =>
    request(`/guilds/create?user_id=${userId}&name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`, { method: 'POST' }),
  guildJoin: (userId: string, codeOrId: string) =>
    request(`/guilds/join?user_id=${userId}&code_or_id=${codeOrId}`, { method: 'POST' }),
  guildLeave: (userId: string) =>
    request(`/guilds/leave?user_id=${userId}`, { method: 'POST' }),
  // Push
  pushRegister: (userId: string, token: string, platform = 'expo') =>
    request(`/push/register?user_id=${userId}&token=${encodeURIComponent(token)}&platform=${platform}`, { method: 'POST' }),
  // Razorpay config (toggle between real/mock)
  razorpayConfig: () => request('/payments/razorpay/config'),
  leaderboard: (period = 'all') => request(`/leaderboard?period=${period}`),
  tournaments: () => request('/tournaments'),
  registerTournament: (userId: string, tournamentId: string) =>
    request(`/tournament/register?user_id=${userId}&tournament_id=${tournamentId}`, { method: 'POST' }),
  achievements: (userId: string) => request(`/achievements/${userId}`),
  friends: (userId: string) => request(`/friends/${userId}`),
  addFriend: (userId: string, friendCode: string) =>
    request('/friends/add', { method: 'POST', body: JSON.stringify({ user_id: userId, friend_code: friendCode }) }),
  transactions: (userId: string) => request(`/transactions/${userId}`),
  shopItems: () => request('/shop/items'),
  purchaseBcoins: (userId: string, itemId: string) =>
    request('/shop/purchase-bcoins', { method: 'POST', body: JSON.stringify({ user_id: userId, item_id: itemId }) }),
  createRazorpayOrder: (userId: string, itemId: string) =>
    request('/payments/razorpay/create-order', { method: 'POST', body: JSON.stringify({ user_id: userId, item_id: itemId }) }),
  verifyRazorpay: (payload: any) =>
    request('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify(payload) }),
};

const KEY_USER = 'bingo_user';
const KEY_DEVICE = 'bingo_device';
const KEY_ONBOARD = 'bingo_onboarded';
const KEY_SETTINGS = 'bingo_settings';

export const storage = {
  getUser: async () => {
    const raw = await AsyncStorage.getItem(KEY_USER);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: async (user: any) => {
    await AsyncStorage.setItem(KEY_USER, JSON.stringify(user));
  },
  clearUser: async () => {
    await AsyncStorage.removeItem(KEY_USER);
  },
  getDeviceId: async () => {
    let id = await AsyncStorage.getItem(KEY_DEVICE);
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(KEY_DEVICE, id);
    }
    return id;
  },
  isOnboarded: async () => (await AsyncStorage.getItem(KEY_ONBOARD)) === '1',
  setOnboarded: async () => AsyncStorage.setItem(KEY_ONBOARD, '1'),
  getSettings: async () => {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    return raw ? JSON.parse(raw) : { sound: true, music: true, notifications: true };
  },
  setSettings: async (s: any) => AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(s)),
};
