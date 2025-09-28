import LoadingScreen from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';


export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
                {user ? (
                  <>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="home" options={{ headerShown: false }} />
                    <Stack.Screen name="add-trade" options={{ headerShown: false }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                  </>
                ) : (
          <>
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          </>
        )}
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
