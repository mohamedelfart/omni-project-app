export const colors = {
  primary: '#1E3A5F',
  primaryStrong: '#15304E',
  primarySoft: '#E7EEF6',
  accent: '#F97316',
  accentSoft: '#FFF1E7',
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#D9E2EC',
  text: '#1F2937',
  secondary: '#6B7280',
  success: '#1F9D67',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
  overlay: 'rgba(15, 23, 42, 0.18)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
  },
  heading1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  heading2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  heading3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
} as const;