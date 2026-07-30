import { Platform } from 'react-native';

export const theme = {
  colors: {
    deepGreen: '#C20A72',
    deepGreenPressed: '#9F075D',
    darkGreenText: '#26160F',
    mint: '#087A8C',
    mintDark: '#006879',
    lightMint: '#FFF0F7',
    cream: '#FFFBFD',
    lavender: '#F6EFF8',
    coral: '#F3CF18',
    lightCoral: '#FFF8CD',
    white: '#FFFFFF',
    text: '#2B1A15',
    mutedText: '#75666F',
    border: '#EFDFE8',
    disabled: '#B9AAB2',
    danger: '#A90855',
    gold: '#F3CF18',
    paleGold: '#FFF8CD',
    tabInactive: '#927F8A',
    plum: '#57106F',
    teal: '#087A8C',

    // Backward-compatible aliases for the starter components that remain in the project.
    primary: '#C20A72',
    primaryDark: '#9F075D',
    primarySoft: '#FFF0F7',
    accent: '#087A8C',
    accentDark: '#006879',
    accentSoft: '#E8F6F7',
    background: '#FFFBFD',
    backgroundSoft: '#F6EFF8',
    card: '#FFFFFF',
    cardAlt: '#FFF0F7',
    success: '#087A8C',
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
          shadowColor: '#57106F',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.09,
          shadowRadius: 20,
        },
        android: {
          elevation: 4,
        },
        default: {
          shadowColor: '#57106F',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        },
      }) ?? {},
    button:
      Platform.select({
        ios: {
          shadowColor: '#C20A72',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
        },
        android: {
          elevation: 3,
        },
        default: {
          shadowColor: '#C20A72',
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
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
