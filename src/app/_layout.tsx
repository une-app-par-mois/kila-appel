import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDatabase } from '@/hooks/useDatabase';

// Navigation racine (Expo Router). La base s'ouvre au démarrage ; les onglets arrivent au ticket 012.
// Racine des gestes : la poignée ≡ des contacts d'urgence (008b).
export default function RootLayout() {
  useDatabase();
  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
