/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Add missing properties for compatibility
    tabBarBackground: '#fff',
    tabBarBorder: '#e5e7eb',
  },
  dark: {
    // Main background - pure black
    background: '#000000',
    // Card backgrounds - very dark gray
    cardBackground: '#1A1A1A',
    // Primary text - light gray with white shade
    text: '#E5E5E5',
    // Secondary text - medium gray
    textSecondary: '#CCCCCC',
    // Muted text - darker gray
    textMuted: '#999999',
    // Input backgrounds - dark gray
    inputBackground: '#2A2A2A',
    // Input borders - medium gray
    inputBorder: '#555555',
    // Disabled input background - darker
    inputDisabled: '#1A1A1A',
    // Button colors - white/off-white
    buttonBackground: '#FFFFFF',
    buttonText: '#000000',
    buttonSecondary: '#F5F5F5',
    // Accent colors
    accent: '#FFFFFF', // White
    success: '#10B981', // Green
    warning: '#F59E0B', // Orange/Yellow
    error: '#EF4444', // Red
    // Tab bar - pure black
    tabBarBackground: '#000000',
    tabBarBorder: '#333333',
    tabIconDefault: '#FFFFFF',
    tabIconSelected: '#FFFFFF',
    // Legacy properties for compatibility
    tint: '#FFFFFF',
    icon: '#FFFFFF',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
