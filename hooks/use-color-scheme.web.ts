// Force dark mode only - disable adaptive appearance for web
export function useColorScheme() {
  return 'dark' as const;
}
