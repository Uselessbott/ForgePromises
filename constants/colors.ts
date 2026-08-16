export type ThemeKey = 'super_amoled' | 'light';
export type AccentKey =
  | 'orange'
  | 'red'
  | 'maroon'
  | 'blue'
  | 'green'
  | 'purple'
  | 'pink'
  | 'cyan'
  | 'yellow';

export const ACCENT_KEYS: AccentKey[] = [
  'orange',
  'red',
  'maroon',
  'blue',
  'green',
  'purple',
  'pink',
  'cyan',
  'yellow',
];

export const ACCENT_MAP: Record<AccentKey, string> = {
  orange: '#E05A1A',
  red: '#EF4444',
  maroon: '#800000',
  blue: '#3B82F6',
  green: '#22C55E',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  yellow: '#F59E0B',
};

export interface ColorPalette {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  success: string;
  warning: string;
  surface: string;
}

export function generateColors(theme: ThemeKey, accentKey: AccentKey): ColorPalette {
  const accentHex = ACCENT_MAP[accentKey];

  if (theme === 'super_amoled') {
    return {
      text: '#F2F2F2',
      tint: accentHex,
      background: '#000000',
      foreground: '#F2F2F2',
      card: '#0A0A0A',
      cardForeground: '#F2F2F2',
      primary: accentHex,
      primaryForeground: '#FFFFFF',
      secondary: '#1A1A1A',
      secondaryForeground: '#F2F2F2',
      muted: '#1A1A1A',
      mutedForeground: '#555555',
      accent: accentHex,
      accentForeground: '#FFFFFF',
      destructive: '#EF4444',
      destructiveForeground: '#FFFFFF',
      border: '#1E1E1E',
      input: '#181818',
      success: '#22C55E',
      warning: '#F59E0B',
      surface: '#0A0A0A',
    };
  }

  // light
  return {
    text: '#0a0a0a',
    tint: accentHex,
    background: '#FFFFFF',
    foreground: '#0a0a0a',
    card: '#F4F4F4',
    cardForeground: '#0a0a0a',
    primary: accentHex,
    primaryForeground: '#ffffff',
    secondary: '#f0f0f0',
    secondaryForeground: '#1a1a1a',
    muted: '#f0f0f0',
    mutedForeground: '#737373',
    accent: accentHex,
    accentForeground: '#ffffff',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    border: '#e5e5e5',
    input: '#ebebeb',
    success: '#22C55E',
    warning: '#F59E0B',
    surface: '#F8F8F8',
  };
}

const colors = {
  light: generateColors('light', 'orange'),
  dark: generateColors('super_amoled', 'orange'),
  radius: 12,
};

export default colors;
