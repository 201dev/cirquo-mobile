/**
 * Cirquo design system tokens mirrored from web `src/index.css`.
 * Light theme is the primary theme for outdoor/mobile legibility.
 */
export const colors = {
  leaf50: '#f0faf3',
  leaf100: '#dcf5e5',
  leaf200: '#bbeaca',
  leaf300: '#8adaa6',
  leaf400: '#4fc27b',
  leaf500: '#1bac4b', // brand green
  leaf600: '#148c3c',
  leaf700: '#107333', // action green (WCAG AA with white text)
  leaf800: '#0e5b2b',
  leaf900: '#0b4a25',
  leaf950: '#052a15',

  ink50: '#f7faf8',
  ink100: '#f0f3f1',
  ink200: '#e3e8e5',
  ink300: '#d9dedb',
  ink400: '#cbd3ce',
  ink500: '#9aa5a0',
  ink600: '#6e7873',
  ink700: '#4f5854',
  ink800: '#34393a',
  ink900: '#272727',

  brandGreen: '#1bac4b',
  brandPlum: '#444053',
  brandMint: '#45de78',
  brandYellow: '#ffd037',
  brandCharcoal: '#272727',
  brandWhyCard: '#e9fddd',

  background: '#f7faf8',
  foreground: '#272727',
  card: '#ffffff',
  cardForeground: '#272727',
  primary: '#107333',
  primaryForeground: '#f7faf8',
  secondary: '#edf7f0',
  secondaryForeground: '#444053',
  muted: '#f0f3f1',
  mutedForeground: '#444053',
  accent: '#e2f8e9',
  accentForeground: '#272727',
  destructive: '#d93025',
  destructiveSoft: '#fdeceb',
  destructiveBorder: '#f4b8b4',
  warning: '#fff6da',
  warningForeground: '#6b4e00',
  warningBorder: '#f3dc99',
  border: '#d9dedb',
  input: '#cbd3ce',
  ring: '#1bac4b',

  // Semantic material outcomes — fixed across the product
  rescued: '#1bac4b',
  rescuedSoft: '#e4f7ea',
  rescuedBorder: '#a8e2bc',
  recovered: '#ffd037',
  recoveredSoft: '#fff7d6',
  recoveredBorder: '#f0d77a',
  residual: '#9c7c5b',
  residualSoft: '#f3ede6',
  residualBorder: '#d7c5b2',
  inProgress: '#3f84b6',
  inProgressSoft: '#e6f2fa',
  inProgressBorder: '#b2d4ec',

  sidebar: '#f0f6f2',
  white: '#ffffff',
  black: '#000000',
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const shadowCard = {
  shadowColor: colors.ink900,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 1,
} as const;

export const shadowRaised = {
  shadowColor: colors.ink900,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.14,
  shadowRadius: 14,
  elevation: 4,
} as const;
