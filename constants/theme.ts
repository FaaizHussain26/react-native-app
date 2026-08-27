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

export type FilterType = 'original' | 'warm' | 'cool' | 'pastel' | 'mono' | 'sepia';

// CSS filter strings for expo-print HTML (exact match to web app).
// Each named preset carries its own contrast/saturation push (not just a
// hue/tone shift) so results read as an actual edit rather than a subtle
// color cast — "original" is left untouched as the true unedited baseline.
export const FILTER_CSS: Record<FilterType, string> = {
  original: '',
  warm: 'contrast(108%) saturate(140%) sepia(25%) hue-rotate(-10deg) brightness(103%)',
  cool: 'contrast(106%) saturate(115%) hue-rotate(18deg) brightness(105%)',
  pastel: 'saturate(70%) brightness(112%) contrast(90%) sepia(8%)',
  mono: 'grayscale(100%) contrast(115%)',
  sepia: 'sepia(80%) contrast(105%) saturate(105%)',
};

export interface PhotoAdjustments {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  warmth?: number;
}

// Combines the manual adjustment sliders with the active named filter into a
// single CSS filter string, shared by the live preview and the printed HTML.
export const buildCssFilter = (
  filter: FilterType,
  adjustments: PhotoAdjustments = {},
): string => {
  const { brightness = 100, contrast = 100, saturation = 100, warmth = 0 } = adjustments;
  return [
    brightness !== 100 ? `brightness(${brightness}%)` : '',
    contrast !== 100 ? `contrast(${contrast}%)` : '',
    saturation !== 100 ? `saturate(${saturation}%)` : '',
    warmth !== 0 ? `hue-rotate(${warmth}deg)` : '',
    FILTER_CSS[filter] ?? '',
  ]
    .filter(Boolean)
    .join(' ');
};

// FilteredImage.tsx (native preview) derives its SVG color matrix directly by
// parsing FILTER_CSS above — so the on-screen preview can never silently
// drift from what actually prints.
