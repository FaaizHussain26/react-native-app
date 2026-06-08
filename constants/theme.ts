export const COLORS = {
  primary: '#2A3B26',
  primaryForeground: '#F3EEE7',
  background: '#F3EEE7',
  foreground: '#18181B',
  card: '#FFFFFF',
  cardForeground: '#18181B',
  border: '#E4E4E7',
  textPrimary: '#18181B',
  textSecondary: '#52525B',
  miscLight: '#F9F9FA',
  miscMedium: '#CCCCCC',
  miscDark: '#8B8B8D',
  muted: '#71717A',
  destructive: '#DC2626',
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F4F4F5',
  gray200: '#E4E4E7',
  gray500: '#71717A',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
};

export type FilterType =
  | 'original'
  | 'warm'
  | 'cool'
  | 'pastel'
  | 'mono'
  | 'sepia'
  | 'kodakgold'
  | 'portra160light'
  | 'portra160dark';

// CSS filter strings for expo-print HTML (exact match to web app)
export const FILTER_CSS: Record<FilterType, string> = {
  original: '',
  warm: 'sepia(20%) saturate(140%) hue-rotate(-10deg)',
  cool: 'saturate(90%) hue-rotate(15deg) brightness(105%)',
  pastel: 'saturate(70%) brightness(110%) contrast(90%)',
  mono: 'grayscale(100%)',
  sepia: 'sepia(80%)',
  // Film LUT presets — CSS approximations of the Lightroom XMP values
  kodakgold: 'brightness(110%) contrast(108%) saturate(117%) sepia(15%) hue-rotate(-8deg)',
  portra160light: 'brightness(105%) contrast(95%) saturate(108%) hue-rotate(5deg)',
  portra160dark: 'brightness(88%) contrast(97%) saturate(112%) hue-rotate(10deg)',
};

// SVG color matrix values for FilteredImage component (native preview)
export const FILTER_MATRICES = {
  grayscale: '0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0',
  sepia80: '0.545 0.615 0.151 0 0  0.279 0.549 0.134 0 0  0.218 0.427 0.105 0 0  0 0 0 1 0',
};
