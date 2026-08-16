

import colors from "@/constants/colors";
import { useHabits } from '@/context/HabitsContext';
import { generateColors, ACCENT_MAP, type ThemeKey, type AccentKey } from '@/constants/colors';


/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 */
export function useColors() {
  const { settings } = useHabits();

  const theme: ThemeKey =
    settings.theme === 'light' ? 'light' : 'super_amoled';

  const rawAccent = (settings as any).accentColor;
  const accent: AccentKey =
    rawAccent && ACCENT_MAP[rawAccent as AccentKey]
      ? (rawAccent as AccentKey)
      : 'orange';

  const palette = generateColors(theme, accent);
  return { ...palette, radius: colors.radius };
}
