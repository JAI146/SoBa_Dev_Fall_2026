import { Platform } from 'react-native';

export const theme = {
  colors: {
    deepGreen: '#DC0D7F',
    deepGreenPressed: '#3E022C',
    darkGreenText: '#3E022C',
    mint: '#14DA94',
    mintDark: '#016171',
    lightPink: '#FFE7F3',
    lightMint: '#D2F9EB',
    lightTeal: '#D2F9EB',
    lightGold: '#FFF8E0',
    cream: '#FFFBFD',
    lavender: '#F6EFF8',
    coral: '#DBA731',
    lightCoral: '#FFF8E0',
    white: '#FFFFFF',
    text: '#2B1A15',
    mutedText: '#75666F',
    border: '#EFDFE8',
    disabled: '#B9AAB2',
    danger: '#A90855',
    gold: '#DBA731',
    paleGold: '#FFF8E0',
    tabInactive: '#927F8A',
    plum: '#3E022C',
    teal: '#016171',

    // Backward-compatible aliases for the starter components that remain in the project.
    primary: '#DC0D7F',
    primaryDark: '#3E022C',
    primarySoft: '#FFE7F3',
    accent: '#016171',
    accentDark: '#016171',
    accentSoft: '#D2F9EB',
    background: '#FFFBFD',
    backgroundSoft: '#F6EFF8',
    card: '#FFFFFF',
    cardAlt: '#FFE7F3',
    success: '#14DA94',
    inputBackground: '#FFFCFE',
    chip: '#FAF2F7',
    ink: '#26160F',
    graphite: '#F8F3F6',
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 40,
    xxxl: 52,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 26,
    xxl: 32,
    pill: 999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 38,
  },
  shadows: {
    card:
      Platform.select({
        ios: {
          shadowColor: '#3E022C',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.09,
          shadowRadius: 20,
        },
        android: {
          elevation: 4,
        },
        default: {
          shadowColor: '#3E022C',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        },
      }) ?? {},
    button:
      Platform.select({
        ios: {
          shadowColor: '#DC0D7F',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
        },
        android: {
          elevation: 3,
        },
        default: {
          shadowColor: '#DC0D7F',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
      }) ?? {},
  },
};

export type AppTheme = typeof theme;

export const Colors = {
  light: {
    text: theme.colors.text,
    background: theme.colors.cream,
    tint: theme.colors.deepGreen,
    icon: theme.colors.mutedText,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.deepGreen,
  },
  dark: {
    text: theme.colors.text,
    background: theme.colors.cream,
    tint: theme.colors.deepGreen,
    icon: theme.colors.mutedText,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.deepGreen,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Poppins_400Regular',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Poppins_400Regular',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Poppins_400Regular', system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
