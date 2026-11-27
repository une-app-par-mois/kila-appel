import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { resetDatabase, retryDatabase, useDatabaseState } from '@/hooks/useDatabase';
import { useStartupCleanup } from '@/hooks/useStartupCleanup';
import { Recovery } from '@/ui/Recovery';

// Navigation racine (Expo Router). La base s'ouvre au démarrage ; les onglets sont dans
// `(tabs)/_layout.tsx`, le reste s'ouvre par-dessus, dans cette pile.
// EX-22 (ticket 014c) : si la base ne s'ouvre pas, l'écran de récupération remplace la pile.
// Les dossiers temporaires sont vidés une fois au démarrage, hors opération en cours.
// Racine des gestes : la poignée ≡ des contacts d'urgence (008b).
export default function RootLayout() {
  const database = useDatabaseState();
  useStartupCleanup();
  return (
    <GestureHandlerRootView style={styles.root}>
      {database.status === 'failed' ? (
        <Recovery
          cause={database.cause}
          pending={database.pending}
          onRetry={retryDatabase}
          onStartOver={() => void resetDatabase()}
        />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
