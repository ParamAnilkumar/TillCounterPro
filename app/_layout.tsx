import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { lightTheme, darkTheme } from '../src/theme';
import { initDb } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';
import { ActivityIndicator, View, StatusBar } from 'react-native';

export default function RootLayout() {
  const { darkMode } = useSettingsStore();
  const [dbReady, setDbReady] = useState(false);
  const theme = darkMode ? darkTheme : lightTheme;

  useEffect(() => {
    async function setup() {
      try {
        await initDb();
        await seedDatabase();
      } catch (e) {
        console.error('Database init error:', e);
      } finally {
        setDbReady(true);
      }
    }
    setup();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkMode ? '#0F172A' : '#F0F4F8' }}>
        <ActivityIndicator size="large" color={darkMode ? '#34D399' : '#00897B'} />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="count/[id]" options={{ title: 'Till Count' }} />
        <Stack.Screen name="combine" options={{ title: 'Combine Tills' }} />
        <Stack.Screen name="denominations" options={{ title: 'Manage Denominations' }} />

        <Stack.Screen name="+not-found" />
      </Stack>
    </PaperProvider>
  );
}
