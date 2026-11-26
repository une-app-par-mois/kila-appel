import { Stack } from 'expo-router';
import { useDatabase } from '@/hooks/useDatabase';

// Navigation racine (Expo Router). La base s'ouvre au démarrage ; les onglets arrivent au ticket 012.
export default function RootLayout() {
  useDatabase();
  return <Stack screenOptions={{ headerShown: false }} />;
}
