import { Stack } from 'expo-router';

// Navigation racine (Expo Router). Les onglets arrivent au ticket 012.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
