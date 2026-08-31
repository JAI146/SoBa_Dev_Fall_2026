/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ThemeName = keyof typeof Colors;
type ThemeColorName = keyof (typeof Colors)['light'];

export function useThemeColor(
  props: Partial<Record<ThemeName, string>>,
  colorName: ThemeColorName,
) {
  const colorScheme = useColorScheme();
  const themeName: ThemeName = colorScheme === 'dark' ? 'dark' : 'light';
  const colorFromProps = props[themeName];

  if (colorFromProps) {
    return colorFromProps;
  }
  return Colors[themeName][colorName];
}
