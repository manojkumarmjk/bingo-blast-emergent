// Bingo Blast Design System
export const colors = {
  bg: '#1A0B2E',
  surface: '#2B1A4A',
  surfaceHi: '#3E2966',
  modalOverlay: 'rgba(10, 4, 18, 0.85)',
  primary: '#F72585',
  primary2: '#B5179E',
  secondary: '#4CC9F0',
  secondary2: '#4895EF',
  gold: '#FFD166',
  gold2: '#FCA311',
  text: '#FFFFFF',
  textDim: '#A393C4',
  textMute: '#635682',
  onGold: '#4A3000',
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#4CC9F0',
  bingoB: '#FF3366',
  bingoI: '#FFD166',
  bingoN: '#06D6A0',
  bingoG: '#4CC9F0',
  bingoO: '#9D4EDD',
};

export const gradients = {
  primary: ['#F72585', '#B5179E'] as const,
  secondary: ['#4CC9F0', '#4895EF'] as const,
  gold: ['#FFD166', '#FCA311'] as const,
  free: ['#4CC9F0', '#4895EF'] as const,
  prestige: ['#7209B7', '#4361EE'] as const,
  luxury: ['#FFD166', '#FCA311'] as const,
  tournament: ['#F72585', '#7209B7'] as const,
  bgDark: ['#1A0B2E', '#3E2966'] as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  glowPrimary: {
    shadowColor: '#F72585',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  glowGold: {
    shadowColor: '#FFD166',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 };

export const radius = { sm: 8, md: 16, lg: 24, pill: 999 };

export const type = {
  h1: { fontSize: 40, fontWeight: '900' as const, letterSpacing: 1, lineHeight: 48 },
  h2: { fontSize: 32, fontWeight: '800' as const, letterSpacing: 0.5, lineHeight: 40 },
  h3: { fontSize: 24, fontWeight: '800' as const, lineHeight: 32 },
  title: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  bodyL: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  badge: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
};

export const media = {
  splashBg: 'https://static.prod-images.emergentagent.com/jobs/ccfa2a0d-405b-4e25-af22-cc76daa2d7bb/images/248655e4bbe9ee5fa4dbd8ea78ea22f17957eb6cd682a980c3948f6f6bf41940.png',
  coins: 'https://static.prod-images.emergentagent.com/jobs/ccfa2a0d-405b-4e25-af22-cc76daa2d7bb/images/5eeed84ee6a61c77ecf261267b0ac6acfbcf81b2ff6e5a5a191f200d6d38f67d.png',
  tournament: 'https://static.prod-images.emergentagent.com/jobs/ccfa2a0d-405b-4e25-af22-cc76daa2d7bb/images/73f2be1c64449ace55714b96eb24b9d443660141248bc0c58beae4f61ca0111a.png',
  balls: 'https://static.prod-images.emergentagent.com/jobs/ccfa2a0d-405b-4e25-af22-cc76daa2d7bb/images/535ba923989db690db0cdde59f334322d2d85ba4681761ed67386255056bda9f.png',
};

export const columnColor = (col: number) =>
  [colors.bingoB, colors.bingoI, colors.bingoN, colors.bingoG, colors.bingoO][col] || colors.primary;

export const columnLetter = (col: number) => ['B', 'I', 'N', 'G', 'O'][col];
