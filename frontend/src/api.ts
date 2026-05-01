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
  createComputerMatch: (userId: string, difficulty = 'medium') =>
    request('/computer-match', { method: 'POST', body: JSON.stringify({ user_id: userId, difficulty }) }),
  callNumber: (matchId: string) =>
    request('/computer-match/call', { method: 'POST', body: JSON.stringify({ match_id: matchId }) }),
  claimBingo: (matchId: string, userId: string) =>
    request('/computer-match/claim-bingo', { method: 'POST', body: JSON.stringify({ match_id: matchId, user_id: userId }) }),
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
